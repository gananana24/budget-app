import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { CategoryNameConflictError } from "../../../domain/category/exceptions/category-name-conflict-error"
import { CategoryNotFoundError } from "../../../domain/category/exceptions/category-not-found-error"
import { ClerkUserId } from "../../../domain/user/value-objects/clerk-user-id"
import { DefaultBootstrapUseCase } from "../../../usecase/bootstrap/bootstrap-use-case"
import { DefaultCreateCategoryUseCase } from "../../../usecase/category/create-category-use-case"
import { DefaultDeleteCategoryUseCase } from "../../../usecase/category/delete-category-use-case"
import { DefaultListCategoriesUseCase } from "../../../usecase/category/list-categories-use-case"
import { DefaultUpdateCategoryUseCase } from "../../../usecase/category/update-category-use-case"
import { PostgresBudgetPeriodRepository } from "../budget/postgres-budget-period-repository"
import { withPostgresTransaction } from "../database"
import { PostgresHouseholdMembershipRepository } from "../household/postgres-household-membership-repository"
import { PostgresHouseholdRepository } from "../household/postgres-household-repository"
import { PostgresUserRepository } from "../user/postgres-user-repository"
import { PostgresCategoryRepository } from "./postgres-category-repository"

const DATABASE_URL =
	process.env.TEST_DATABASE_URL ??
	"postgresql://postgres:postgres@127.0.0.1:54322/budget_app_test?sslmode=disable"
if (!new URL(DATABASE_URL).pathname.slice(1).endsWith("_test"))
	throw new Error("A dedicated test database is required")

async function bootstrap(clerkUserId: string) {
	return withPostgresTransaction(DATABASE_URL, (client) =>
		new DefaultBootstrapUseCase({
			userRepository: new PostgresUserRepository(client),
			householdRepository: new PostgresHouseholdRepository(client),
			householdMembershipRepository: new PostgresHouseholdMembershipRepository(client),
			budgetPeriodRepository: new PostgresBudgetPeriodRepository(client),
			now: () => new Date("2026-10-05T00:00:00.000Z"),
		}).execute(ClerkUserId.from(clerkUserId)),
	)
}

describe("category management with PostgreSQL", () => {
	const inspector = new Client({ connectionString: DATABASE_URL })
	beforeAll(async () => {
		await inspector.connect()
		await inspector.query("SELECT pg_advisory_lock(742001)")
	})
	beforeEach(async () => {
		await inspector.query("DELETE FROM public.households")
		await inspector.query("DELETE FROM public.users")
	})
	afterAll(async () => {
		await inspector.query("SELECT pg_advisory_unlock(742001)")
		await inspector.end()
	})

	it("lists initial categories first and custom categories in creation order after a rename", async () => {
		// Arrange
		const owner = await bootstrap("clerk_category_order")
		const first = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: owner,
				name: "  ペット  ",
				iconName: "paw-print",
			}),
		)
		const second = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: owner,
				name: "学費",
				iconName: "graduation-cap",
			}),
		)

		// Act
		await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultUpdateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: owner,
				categoryId: first.id,
				name: "飼育費",
				iconName: "dog",
			}),
		)
		const result = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultListCategoriesUseCase(new PostgresCategoryRepository(client)).execute(owner),
		)

		// Assert
		expect(result.map(({ name }) => name)).toEqual([
			"食費",
			"日用品",
			"住居費",
			"水道光熱費",
			"通信費",
			"交通費",
			"医療費",
			"娯楽費",
			"その他",
			"飼育費",
			"学費",
		])
		expect(result.slice(9).map(({ id }) => id)).toEqual([first.id, second.id])
		expect(result.slice(9).map(({ iconName }) => iconName)).toEqual(["dog", "graduation-cap"])
		expect(result.slice(0, 9).every(({ isInitial }) => isInitial)).toBe(true)
	})

	it("rejects case-insensitive duplicates against custom and initial categories", async () => {
		// Arrange
		const owner = await bootstrap("clerk_category_duplicate")
		await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: owner,
				name: "Travel",
				iconName: "plane",
			}),
		)

		// Act
		const results = await Promise.allSettled([
			withPostgresTransaction(DATABASE_URL, (client) =>
				new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
					authorization: owner,
					name: "travel",
					iconName: "plane",
				}),
			),
			withPostgresTransaction(DATABASE_URL, (client) =>
				new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
					authorization: owner,
					name: "食費",
					iconName: "utensils",
				}),
			),
		])

		// Assert
		expect(
			results.every(
				(result) =>
					result.status === "rejected" && result.reason instanceof CategoryNameConflictError,
			),
		).toBe(true)
	})

	it("treats initial, other household, and missing IDs as unavailable for changes", async () => {
		// Arrange
		const owner = await bootstrap("clerk_category_owner")
		const other = await bootstrap("clerk_category_other")
		const ownCategory = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: other,
				name: "他人の分類",
				iconName: "tag",
			}),
		)
		const initialId = (
			await inspector.query("SELECT id::text FROM public.categories WHERE seed_key = 'food'")
		).rows[0].id
		const missingId = "00000000-0000-4000-8000-000000000099"

		// Act
		const results = await Promise.allSettled(
			[initialId, ownCategory.id, missingId].flatMap((categoryId) => [
				withPostgresTransaction(DATABASE_URL, (client) =>
					new DefaultUpdateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
						authorization: owner,
						categoryId,
						name: "新名称",
						iconName: "tag",
					}),
				),
				withPostgresTransaction(DATABASE_URL, (client) =>
					new DefaultDeleteCategoryUseCase(new PostgresCategoryRepository(client)).execute({
						authorization: owner,
						categoryId,
					}),
				),
			]),
		)

		// Assert
		expect(results).toHaveLength(6)
		expect(
			results.every(
				(result) => result.status === "rejected" && result.reason instanceof CategoryNotFoundError,
			),
		).toBe(true)
	})

	it("keeps expenses and period totals while removing all budgets for a deleted category", async () => {
		// Arrange
		const owner = await bootstrap("clerk_category_delete_flow")
		const category = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: owner,
				name: "ペット",
				iconName: "paw-print",
			}),
		)
		await inspector.query(
			"INSERT INTO public.budget_periods (household_id, month_start) VALUES ($1, '2026-09-01'), ($1, '2026-10-01') ON CONFLICT DO NOTHING",
			[owner.householdId.value],
		)
		await inspector.query(
			"INSERT INTO public.monthly_budgets (household_id, month_start, category_id, amount) VALUES ($1, '2026-09-01', $2, 1000), ($1, '2026-10-01', $2, 2000)",
			[owner.householdId.value, category.id],
		)
		await inspector.query(
			"INSERT INTO public.expenses (household_id, category_id, expense_date, amount) VALUES ($1, $2, '2026-10-03', 500)",
			[owner.householdId.value, category.id],
		)

		// Act
		await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultDeleteCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: owner,
				categoryId: category.id,
			}),
		)

		// Assert
		const result = await inspector.query(
			`SELECT
		  (SELECT count(*)::int FROM public.expenses WHERE household_id = $1 AND category_id IS NULL) AS uncategorized_count,
		  (SELECT sum(amount)::int FROM public.expenses WHERE household_id = $1) AS expense_total,
		  (SELECT count(*)::int FROM public.monthly_budgets WHERE household_id = $1) AS budget_count,
		  (SELECT count(*)::int FROM public.budget_periods WHERE household_id = $1) AS period_count`,
			[owner.householdId.value],
		)
		expect(result.rows[0]).toEqual({
			uncategorized_count: 1,
			expense_total: 500,
			budget_count: 0,
			period_count: 2,
		})
	})
})
