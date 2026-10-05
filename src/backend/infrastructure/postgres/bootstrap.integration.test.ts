import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { User } from "../../domain/user/entities/user"
import { ClerkUserId } from "../../domain/user/value-objects/clerk-user-id"
import { DefaultResolveAuthorizationUseCase } from "../../usecase/authorization/resolve-authorization-use-case"
import { DefaultBootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import { PostgresBudgetPeriodRepository } from "./budget/postgres-budget-period-repository"
import { withPostgresClient, withPostgresTransaction } from "./database"
import { PostgresHouseholdMembershipRepository } from "./household/postgres-household-membership-repository"
import { PostgresHouseholdRepository } from "./household/postgres-household-repository"
import { PostgresUserRepository } from "./user/postgres-user-repository"

const DEFAULT_TEST_DATABASE_URL =
	"postgresql://postgres:postgres@127.0.0.1:54322/budget_app_test?sslmode=disable"
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL

function requireDedicatedTestDatabase(connectionString: string): void {
	const databaseName = new URL(connectionString).pathname.slice(1)
	if (!databaseName.endsWith("_test")) {
		throw new Error("Integration tests require a database whose name ends with _test")
	}
}

async function bootstrap(clerkUserId: string, instant: Date) {
	const authorization = await withPostgresTransaction(TEST_DATABASE_URL, (client) =>
		new DefaultBootstrapUseCase({
			userRepository: new PostgresUserRepository(client),
			householdRepository: new PostgresHouseholdRepository(client),
			householdMembershipRepository: new PostgresHouseholdMembershipRepository(client),
			budgetPeriodRepository: new PostgresBudgetPeriodRepository(client),
			now: () => instant,
		}).execute(ClerkUserId.from(clerkUserId)),
	)

	return {
		userId: authorization.userId.value,
		householdId: authorization.householdId.value,
	}
}

async function resolveAuthorization(clerkUserId: string) {
	const authorization = await withPostgresClient(TEST_DATABASE_URL, (client) =>
		new DefaultResolveAuthorizationUseCase({
			userRepository: new PostgresUserRepository(client),
			householdRepository: new PostgresHouseholdRepository(client),
		}).execute(ClerkUserId.from(clerkUserId)),
	)

	return {
		userId: authorization.userId.value,
		householdId: authorization.householdId.value,
	}
}

requireDedicatedTestDatabase(TEST_DATABASE_URL)

describe("bootstrap with PostgreSQL", () => {
	const inspectionClient = new Client({ connectionString: TEST_DATABASE_URL })

	beforeAll(async () => {
		await inspectionClient.connect()
		await inspectionClient.query("SELECT pg_advisory_lock(742001)")
	})

	beforeEach(async () => {
		await inspectionClient.query("DELETE FROM public.households")
		await inspectionClient.query("DELETE FROM public.users")
	})

	afterAll(async () => {
		await inspectionClient.query("SELECT pg_advisory_unlock(742001)")
		await inspectionClient.end()
	})

	it("provides the shared initial categories before any user starts", async () => {
		// Arrange
		const expectedCategories = [
			["food", "食費"],
			["daily_goods", "日用品"],
			["housing", "住居費"],
			["utilities", "水道光熱費"],
			["communications", "通信費"],
			["transportation", "交通費"],
			["medical", "医療費"],
			["entertainment", "娯楽費"],
			["other", "その他"],
		]

		// Act
		const categories = await inspectionClient.query(
			`SELECT seed_key, name
			 FROM public.categories
			 WHERE household_id IS NULL
			 ORDER BY CASE seed_key
			   WHEN 'food' THEN 1
			   WHEN 'daily_goods' THEN 2
			   WHEN 'housing' THEN 3
			   WHEN 'utilities' THEN 4
			   WHEN 'communications' THEN 5
			   WHEN 'transportation' THEN 6
			   WHEN 'medical' THEN 7
			   WHEN 'entertainment' THEN 8
			   WHEN 'other' THEN 9
			 END`,
		)

		// Assert
		expect(categories.rows.map(({ seed_key, name }) => [seed_key, name])).toEqual(
			expectedCategories,
		)
	})

	it("creates the personal household state once for a first-time user", async () => {
		// Arrange
		const instant = new Date("2026-08-31T15:00:00.000Z")

		// Act
		const authorization = await bootstrap("clerk_first_user", instant)

		// Assert
		const state = await inspectionClient.query(
			`SELECT
			  (SELECT count(*)::int FROM public.users) AS users,
			  (SELECT count(*)::int FROM public.households) AS households,
			  (SELECT count(*)::int FROM public.household_members) AS memberships,
			  (SELECT count(*)::int FROM public.categories) AS categories,
			  (SELECT count(*)::int FROM public.budget_periods) AS periods,
			  (SELECT min(month_start)::text FROM public.budget_periods) AS month`,
		)
		expect(authorization.userId).toMatch(/^[0-9a-f-]{36}$/)
		expect(authorization.householdId).toMatch(/^[0-9a-f-]{36}$/)
		expect(state.rows[0]).toEqual({
			users: 1,
			households: 1,
			memberships: 1,
			categories: 9,
			periods: 1,
			month: "2026-09-01",
		})
	})

	it("keeps the same household and first budget period across later retries", async () => {
		// Arrange
		const firstAuthorization = await bootstrap(
			"clerk_retry_user",
			new Date("2026-09-01T00:00:00.000Z"),
		)

		// Act
		const retriedAuthorization = await bootstrap(
			"clerk_retry_user",
			new Date("2026-10-01T00:00:00.000Z"),
		)

		// Assert
		const periods = await inspectionClient.query(
			"SELECT month_start::text AS month FROM public.budget_periods",
		)
		expect(retriedAuthorization).toEqual(firstAuthorization)
		expect(periods.rows).toEqual([{ month: "2026-09-01" }])
	})

	it("does not duplicate state when the same user starts concurrently", async () => {
		// Arrange
		const instant = new Date("2026-09-27T00:00:00.000Z")
		const attempts = Array.from({ length: 8 }, () => bootstrap("clerk_concurrent_user", instant))

		// Act
		const authorizations = await Promise.all(attempts)

		// Assert
		const state = await inspectionClient.query(
			`SELECT
			  (SELECT count(*)::int FROM public.users) AS users,
			  (SELECT count(*)::int FROM public.households) AS households,
			  (SELECT count(*)::int FROM public.household_members) AS memberships,
			  (SELECT count(*)::int FROM public.categories) AS categories,
			  (SELECT count(*)::int FROM public.budget_periods) AS periods`,
		)
		expect(new Set(authorizations.map(({ userId }) => userId)).size).toBe(1)
		expect(new Set(authorizations.map(({ householdId }) => householdId)).size).toBe(1)
		expect(state.rows[0]).toEqual({
			users: 1,
			households: 1,
			memberships: 1,
			categories: 9,
			periods: 1,
		})
	})

	it("creates only one first budget period across concurrent month-boundary requests", async () => {
		// Arrange
		const attempts = [
			bootstrap("clerk_month_boundary", new Date("2026-09-30T14:59:59.999Z")),
			bootstrap("clerk_month_boundary", new Date("2026-09-30T15:00:00.000Z")),
		]

		// Act
		await Promise.all(attempts)

		// Assert
		const periods = await inspectionClient.query(
			"SELECT month_start::text AS month FROM public.budget_periods",
		)
		expect(periods.rows).toHaveLength(1)
		expect(["2026-09-01", "2026-10-01"]).toContain(periods.rows[0].month)
	})

	it("does not create or modify shared initial categories", async () => {
		// Arrange
		const before = await inspectionClient.query(
			"SELECT id, name, seed_key FROM public.categories ORDER BY seed_key",
		)

		// Act
		await Promise.all([
			bootstrap("clerk_category_boundary_one", new Date("2026-09-27T00:00:00.000Z")),
			bootstrap("clerk_category_boundary_two", new Date("2026-10-27T00:00:00.000Z")),
		])

		// Assert
		const after = await inspectionClient.query(
			"SELECT id, name, seed_key FROM public.categories ORDER BY seed_key",
		)
		expect(after.rows).toEqual(before.rows)
	})

	it("creates isolated personal households for different users", async () => {
		// Arrange
		const instant = new Date("2026-09-27T00:00:00.000Z")

		// Act
		const authorizations = await Promise.all([
			bootstrap("clerk_user_one", instant),
			bootstrap("clerk_user_two", instant),
		])

		// Assert
		const categories = await inspectionClient.query(
			`SELECT
			   count(*)::int AS count,
			   count(household_id)::int AS "householdCategoryCount"
			 FROM public.categories`,
		)
		expect(new Set(authorizations.map(({ householdId }) => householdId)).size).toBe(2)
		expect(categories.rows[0]).toEqual({ count: 9, householdCategoryCount: 0 })
	})

	it("allows every household to use a shared initial category", async () => {
		// Arrange
		const authorizations = await Promise.all([
			bootstrap("clerk_shared_category_one", new Date("2026-09-27T00:00:00.000Z")),
			bootstrap("clerk_shared_category_two", new Date("2026-09-27T00:00:00.000Z")),
		])
		const category = await inspectionClient.query(
			"SELECT id FROM public.categories WHERE seed_key = 'food'",
		)
		const categoryId = category.rows[0].id

		// Act
		for (const authorization of authorizations) {
			await inspectionClient.query(
				`INSERT INTO public.expenses (household_id, category_id, expense_date, amount)
				 VALUES ($1, $2, '2026-09-20', 1000)`,
				[authorization.householdId, categoryId],
			)
		}

		// Assert
		const expenses = await inspectionClient.query(
			"SELECT count(*)::int AS count FROM public.expenses WHERE category_id = $1",
			[categoryId],
		)
		expect(expenses.rows[0]).toEqual({ count: 2 })
	})

	it("rejects another household's custom category from expenses and budgets", async () => {
		// Arrange
		const [owner, other] = await Promise.all([
			bootstrap("clerk_custom_category_owner", new Date("2026-09-27T00:00:00.000Z")),
			bootstrap("clerk_custom_category_other", new Date("2026-09-27T00:00:00.000Z")),
		])
		const category = await inspectionClient.query(
			`INSERT INTO public.categories (household_id, name)
			 VALUES ($1, '旅行')
			 RETURNING id`,
			[owner.householdId],
		)

		// Act
		const results = await Promise.allSettled([
			inspectionClient.query(
				`INSERT INTO public.expenses (household_id, category_id, expense_date, amount)
				 VALUES ($1, $2, '2026-09-20', 1000)`,
				[other.householdId, category.rows[0].id],
			),
			inspectionClient.query(
				`INSERT INTO public.monthly_budgets (household_id, month_start, category_id, amount)
				 VALUES ($1, '2026-09-01', $2, 10000)`,
				[other.householdId, category.rows[0].id],
			),
		])

		// Assert
		expect(results).toEqual([
			{ status: "rejected", reason: expect.objectContaining({ code: "23503" }) },
			{ status: "rejected", reason: expect.objectContaining({ code: "23503" }) },
		])
	})

	it("rejects a custom category with the same name as an initial category", async () => {
		// Arrange
		const authorization = await bootstrap(
			"clerk_duplicate_initial_category",
			new Date("2026-09-27T00:00:00.000Z"),
		)

		// Act
		const insertCategory = inspectionClient.query(
			"INSERT INTO public.categories (household_id, name) VALUES ($1, '食費')",
			[authorization.householdId],
		)

		// Assert
		await expect(insertCategory).rejects.toMatchObject({ code: "23505" })
	})

	it("protects shared initial categories from customization", async () => {
		// Arrange
		const category = await inspectionClient.query(
			"SELECT id FROM public.categories WHERE seed_key = 'food'",
		)
		const categoryId = category.rows[0].id

		// Act
		const results = await Promise.allSettled([
			inspectionClient.query("UPDATE public.categories SET name = '外食' WHERE id = $1", [
				categoryId,
			]),
			inspectionClient.query("DELETE FROM public.categories WHERE id = $1", [categoryId]),
		])

		// Assert
		expect(results).toEqual([
			{ status: "rejected", reason: expect.objectContaining({ code: "23514" }) },
			{ status: "rejected", reason: expect.objectContaining({ code: "23514" }) },
		])
	})

	it("rolls back every record when an operation in the transaction fails", async () => {
		// Arrange
		const initializeThenFail = () =>
			withPostgresTransaction(TEST_DATABASE_URL, async (client) => {
				await new PostgresUserRepository(client).save(
					User.create(ClerkUserId.from("clerk_rollback_user")),
				)
				throw new Error("fail after saving")
			})

		// Act
		const result = initializeThenFail()

		// Assert
		await expect(result).rejects.toBeDefined()
		const users = await inspectionClient.query("SELECT count(*)::int AS count FROM public.users")
		expect(users.rows[0]).toEqual({ count: 0 })
	})

	it("resolves only the authenticated user's personal household membership", async () => {
		// Arrange
		const authorization = await bootstrap(
			"clerk_authorized_user",
			new Date("2026-09-27T00:00:00.000Z"),
		)

		// Act
		const resolved = await resolveAuthorization("clerk_authorized_user")

		// Assert
		expect(resolved).toEqual(authorization)
	})

	it("does not authorize a personal household with a missing membership", async () => {
		// Arrange
		const authorization = await bootstrap(
			"clerk_missing_membership",
			new Date("2026-09-27T00:00:00.000Z"),
		)
		await inspectionClient.query(
			"DELETE FROM public.household_members WHERE household_id = $1 AND user_id = $2",
			[authorization.householdId, authorization.userId],
		)

		// Act
		const resolve = resolveAuthorization("clerk_missing_membership")

		// Assert
		await expect(resolve).rejects.toMatchObject({ name: "BootstrapRequiredError" })
	})

	it("keeps expenses as uncategorized and removes budgets when a custom category is deleted", async () => {
		// Arrange
		const authorization = await bootstrap(
			"clerk_category_delete",
			new Date("2026-09-27T00:00:00.000Z"),
		)
		const category = await inspectionClient.query(
			`INSERT INTO public.categories (household_id, name)
			 VALUES ($1, '旅行')
			 RETURNING id`,
			[authorization.householdId],
		)
		const categoryId = category.rows[0].id
		await inspectionClient.query(
			`INSERT INTO public.expenses (household_id, category_id, expense_date, amount)
			 VALUES ($1, $2, '2026-09-20', 50000)`,
			[authorization.householdId, categoryId],
		)
		await inspectionClient.query(
			`INSERT INTO public.monthly_budgets (household_id, month_start, category_id, amount)
			 VALUES ($1, '2026-09-01', $2, 60000)`,
			[authorization.householdId, categoryId],
		)

		// Act
		await inspectionClient.query(
			"DELETE FROM public.categories WHERE household_id = $1 AND id = $2",
			[authorization.householdId, categoryId],
		)

		// Assert
		const state = await inspectionClient.query(
			`SELECT
			  (SELECT category_id FROM public.expenses LIMIT 1) AS "expenseCategoryId",
			  (SELECT count(*)::int FROM public.monthly_budgets) AS budgets,
			  (SELECT count(*)::int FROM public.budget_periods) AS periods`,
		)
		expect(state.rows[0]).toEqual({ expenseCategoryId: null, budgets: 0, periods: 1 })
	})
})
