import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { ClerkUserId } from "../../../domain/user/value-objects/clerk-user-id"
import { DefaultBootstrapUseCase } from "../../../usecase/bootstrap/bootstrap-use-case"
import { DefaultDeleteMonthlyBudgetUseCase } from "../../../usecase/budget/delete-monthly-budget-use-case"
import { DefaultGetBudgetDraftUseCase } from "../../../usecase/budget/get-budget-draft-use-case"
import { DefaultSaveMonthlyBudgetsUseCase } from "../../../usecase/budget/save-monthly-budgets-use-case"
import { withPostgresReadTransaction, withPostgresTransaction } from "../database"
import { PostgresHouseholdMembershipRepository } from "../household/postgres-household-membership-repository"
import { PostgresHouseholdRepository } from "../household/postgres-household-repository"
import { PostgresUserRepository } from "../user/postgres-user-repository"
import { PostgresBudgetPeriodRepository } from "./postgres-budget-period-repository"
import { PostgresMonthlyBudgetRepository } from "./postgres-monthly-budget-repository"

const TEST_DATABASE_URL =
	process.env.TEST_DATABASE_URL ??
	"postgresql://postgres:postgres@127.0.0.1:54322/budget_app_test?sslmode=disable"
if (!new URL(TEST_DATABASE_URL).pathname.slice(1).endsWith("_test")) {
	throw new Error("Integration tests require a dedicated test database")
}
const now = () => new Date("2027-01-15T00:00:00.000Z")

async function bootstrap(name: string) {
	return withPostgresTransaction(TEST_DATABASE_URL, (client) =>
		new DefaultBootstrapUseCase({
			userRepository: new PostgresUserRepository(client),
			householdRepository: new PostgresHouseholdRepository(client),
			householdMembershipRepository: new PostgresHouseholdMembershipRepository(client),
			budgetPeriodRepository: new PostgresBudgetPeriodRepository(client),
			now: () => new Date("2026-09-15T00:00:00.000Z"),
		}).execute(ClerkUserId.from(name)),
	)
}

type Authorization = Awaited<ReturnType<typeof bootstrap>>

function save(authorization: Authorization, month: string, budgets: unknown) {
	return withPostgresTransaction(TEST_DATABASE_URL, (client) =>
		new DefaultSaveMonthlyBudgetsUseCase(new PostgresMonthlyBudgetRepository(client), now).execute({
			authorization,
			month,
			budgets,
		}),
	)
}

function draft(authorization: Authorization, month: string) {
	return withPostgresReadTransaction(TEST_DATABASE_URL, (client) =>
		new DefaultGetBudgetDraftUseCase(new PostgresMonthlyBudgetRepository(client), now).execute({
			authorization,
			month,
		}),
	)
}

function remove(authorization: Authorization, month: string, categoryId: string) {
	return withPostgresTransaction(TEST_DATABASE_URL, (client) =>
		new DefaultDeleteMonthlyBudgetUseCase(new PostgresMonthlyBudgetRepository(client), now).execute(
			{ authorization, month, categoryId },
		),
	)
}

describe("monthly budgets with PostgreSQL", () => {
	const inspection = new Client({ connectionString: TEST_DATABASE_URL })

	beforeAll(async () => {
		await inspection.connect()
		await inspection.query("SELECT pg_advisory_lock(742001)")
	})

	beforeEach(async () => {
		await inspection.query("DELETE FROM public.households")
		await inspection.query("DELETE FROM public.users")
	})

	afterAll(async () => {
		await inspection.query("SELECT pg_advisory_unlock(742001)")
		await inspection.end()
	})

	it("shows a read-only draft and initializes only the requested month from the latest earlier period", async () => {
		// Arrange
		const authorization = await bootstrap("budget_inherit")
		const food = (
			await inspection.query("SELECT id::text FROM public.categories WHERE seed_key = 'food'")
		).rows[0].id
		await save(authorization, "2026-09-01", [{ categoryId: food, amount: 0 }])

		// Act
		const preview = await draft(authorization, "2026-12-01")
		const before = await inspection.query(
			"SELECT month_start::text FROM public.budget_periods WHERE household_id = $1 ORDER BY month_start",
			[authorization.householdId.value],
		)
		const saved = await save(authorization, "2026-12-01", [{ categoryId: food, amount: 2500 }])
		const after = await inspection.query(
			"SELECT month_start::text FROM public.budget_periods WHERE household_id = $1 ORDER BY month_start",
			[authorization.householdId.value],
		)

		// Assert
		expect(preview).toEqual({
			month: "2026-12-01",
			initialized: false,
			budgets: [{ categoryId: food, amount: 0 }],
		})
		expect(before.rows).toEqual([{ month_start: "2026-09-01" }])
		expect(saved).toEqual({
			month: "2026-12-01",
			initialized: true,
			budgets: [{ categoryId: food, amount: 2500 }],
		})
		expect(after.rows).toEqual([{ month_start: "2026-09-01" }, { month_start: "2026-12-01" }])
	})

	it("preserves unset categories, explicit zero, and existing later months when editing history", async () => {
		// Arrange
		const authorization = await bootstrap("budget_history")
		const rows = await inspection.query(
			"SELECT id::text, seed_key FROM public.categories WHERE seed_key IN ('food', 'housing')",
		)
		const food = rows.rows.find(({ seed_key }) => seed_key === "food").id
		const housing = rows.rows.find(({ seed_key }) => seed_key === "housing").id
		await save(authorization, "2026-09-01", [
			{ categoryId: food, amount: 0 },
			{ categoryId: housing, amount: 9000 },
		])
		await save(authorization, "2026-11-01", [{ categoryId: housing, amount: 10_000 }])
		await remove(authorization, "2026-11-01", food)
		await save(authorization, "2026-10-01", [{ categoryId: food, amount: 700 }])

		// Act
		const november = await draft(authorization, "2026-11-01")
		const december = await draft(authorization, "2026-12-01")

		// Assert
		expect(november.budgets).toEqual([{ categoryId: housing, amount: 10_000 }])
		expect(december).toEqual({
			month: "2026-12-01",
			initialized: false,
			budgets: [{ categoryId: housing, amount: 10_000 }],
		})
	})

	it("does not overwrite inherited budgets on retry or concurrent initialization", async () => {
		// Arrange
		const authorization = await bootstrap("budget_retry")
		const categories = await inspection.query(
			"SELECT id::text, seed_key FROM public.categories WHERE seed_key IN ('food', 'housing')",
		)
		const food = categories.rows.find(({ seed_key }) => seed_key === "food").id
		const housing = categories.rows.find(({ seed_key }) => seed_key === "housing").id
		await save(authorization, "2026-09-01", [
			{ categoryId: food, amount: 500 },
			{ categoryId: housing, amount: 9000 },
		])

		// Act
		await Promise.all([
			save(authorization, "2026-12-01", [{ categoryId: food, amount: 1000 }]),
			save(authorization, "2026-12-01", [{ categoryId: food, amount: 2000 }]),
		])
		const beforeRetry = await draft(authorization, "2026-12-01")
		await save(authorization, "2026-09-01", [{ categoryId: housing, amount: 12_000 }])
		const foodBudget = beforeRetry.budgets.find(({ categoryId }) => categoryId === food)
		if (!foodBudget) throw new Error("Expected an existing food budget")
		await save(authorization, "2026-12-01", [foodBudget])
		const afterRetry = await draft(authorization, "2026-12-01")

		// Assert
		expect([1000, 2000]).toContain(foodBudget.amount)
		expect(beforeRetry.budgets.find(({ categoryId }) => categoryId === housing)?.amount).toBe(9000)
		expect(afterRetry).toEqual(beforeRetry)
	})

	it("rejects another household's category without creating a period", async () => {
		// Arrange
		const [owner, other] = await Promise.all([bootstrap("budget_owner"), bootstrap("budget_other")])
		const category = await inspection.query(
			"INSERT INTO public.categories (household_id, name) VALUES ($1, '旅行') RETURNING id::text",
			[other.householdId.value],
		)
		const foreignId = category.rows[0].id

		// Act
		const attempt = save(owner, "2026-12-01", [{ categoryId: foreignId, amount: 100 }])

		// Assert
		await expect(attempt).rejects.toMatchObject({ name: "BudgetNotFoundError" })
		const periods = await inspection.query(
			"SELECT month_start::text FROM public.budget_periods WHERE household_id = $1",
			[owner.householdId.value],
		)
		expect(periods.rows).toEqual([{ month_start: "2026-09-01" }])
	})

	it("omits a deleted custom category from future drafts while retaining initialized periods", async () => {
		// Arrange
		const authorization = await bootstrap("budget_deleted_category")
		const category = await inspection.query(
			"INSERT INTO public.categories (household_id, name) VALUES ($1, '旅行') RETURNING id::text",
			[authorization.householdId.value],
		)
		const categoryId = category.rows[0].id
		const food = (
			await inspection.query("SELECT id::text FROM public.categories WHERE seed_key = 'food'")
		).rows[0].id
		await save(authorization, "2026-09-01", [{ categoryId, amount: 3000 }])
		await inspection.query("DELETE FROM public.categories WHERE id = $1", [categoryId])

		// Act
		const preview = await draft(authorization, "2026-12-01")
		const saved = await save(authorization, "2026-12-01", [{ categoryId: food, amount: 0 }])
		const periods = await inspection.query(
			"SELECT month_start::text FROM public.budget_periods WHERE household_id = $1 ORDER BY month_start",
			[authorization.householdId.value],
		)

		// Assert
		expect(preview.budgets).toEqual([])
		expect(saved.budgets).toHaveLength(1)
		expect(periods.rows).toEqual([{ month_start: "2026-09-01" }, { month_start: "2026-12-01" }])
	})

	it("returns a retryable conflict after three seconds of household lock contention", async () => {
		// Arrange
		const authorization = await bootstrap("budget_lock")
		const food = (
			await inspection.query("SELECT id::text FROM public.categories WHERE seed_key = 'food'")
		).rows[0].id
		await inspection.query("BEGIN")
		await inspection.query("SELECT id FROM public.households WHERE id = $1 FOR UPDATE", [
			authorization.householdId.value,
		])

		try {
			// Act
			const attempt = save(authorization, "2026-12-01", [{ categoryId: food, amount: 100 }])

			// Assert
			await expect(attempt).rejects.toMatchObject({ name: "BudgetLockConflictError" })
		} finally {
			await inspection.query("ROLLBACK")
		}
	})

	it("rejects future months and duplicate category entries without creating a period", async () => {
		// Arrange
		const authorization = await bootstrap("budget_invalid")
		const food = (
			await inspection.query("SELECT id::text FROM public.categories WHERE seed_key = 'food'")
		).rows[0].id

		// Act
		const attempts = await Promise.allSettled([
			draft(authorization, "2027-02-01"),
			save(authorization, "2027-02-01", [{ categoryId: food, amount: 100 }]),
			remove(authorization, "2027-02-01", food),
			save(authorization, "2026-12-01", [
				{ categoryId: food, amount: 100 },
				{ categoryId: food.toUpperCase(), amount: 200 },
			]),
		])
		const periods = await inspection.query(
			"SELECT month_start::text FROM public.budget_periods WHERE household_id = $1",
			[authorization.householdId.value],
		)

		// Assert
		expect(attempts).toEqual([
			{ status: "rejected", reason: expect.objectContaining({ name: "InvalidValueError" }) },
			{ status: "rejected", reason: expect.objectContaining({ name: "InvalidValueError" }) },
			{ status: "rejected", reason: expect.objectContaining({ name: "InvalidValueError" }) },
			{ status: "rejected", reason: expect.objectContaining({ name: "InvalidValueError" }) },
		])
		expect(periods.rows).toEqual([{ month_start: "2026-09-01" }])
	})
})
