import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { createBootstrap } from "../../application/bootstrap"
import { createPostgresAuthorizationStore } from "./authorization-store"
import { createPostgresBootstrapStore } from "./bootstrap-store"
import { withPostgresClient } from "./postgres"

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
	return withPostgresClient(TEST_DATABASE_URL, (client) =>
		createBootstrap({
			now: () => instant,
			store: createPostgresBootstrapStore(client),
		})({ clerkUserId }),
	)
}

requireDedicatedTestDatabase(TEST_DATABASE_URL)

describe("bootstrap with PostgreSQL", () => {
	const inspectionClient = new Client({ connectionString: TEST_DATABASE_URL })

	beforeAll(async () => {
		await inspectionClient.connect()
	})

	beforeEach(async () => {
		await inspectionClient.query("TRUNCATE public.users CASCADE")
	})

	afterAll(async () => {
		await inspectionClient.end()
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

	it("does not repair an initial category removed outside bootstrap", async () => {
		// Arrange
		await bootstrap("clerk_category_boundary", new Date("2026-09-27T00:00:00.000Z"))
		await inspectionClient.query("DELETE FROM public.categories WHERE seed_key = 'food'")

		// Act
		await bootstrap("clerk_category_boundary", new Date("2026-10-27T00:00:00.000Z"))

		// Assert
		const categories = await inspectionClient.query(
			"SELECT count(*)::int AS count FROM public.categories",
		)
		expect(categories.rows[0]).toEqual({ count: 8 })
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
			"SELECT household_id, count(*)::int AS count FROM public.categories GROUP BY household_id",
		)
		expect(new Set(authorizations.map(({ householdId }) => householdId)).size).toBe(2)
		expect(categories.rows.map(({ count }) => count)).toEqual([9, 9])
	})

	it("rolls back every record when the first budget period is invalid", async () => {
		// Arrange
		const initializeWithInvalidMonth = () =>
			withPostgresClient(TEST_DATABASE_URL, (client) =>
				createPostgresBootstrapStore(client).bootstrap({
					clerkUserId: "clerk_rollback_user",
					monthStart: "invalid-month",
				}),
			)

		// Act
		const result = initializeWithInvalidMonth()

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
		const resolved = await withPostgresClient(TEST_DATABASE_URL, (client) =>
			createPostgresAuthorizationStore(client).findByClerkUserId("clerk_authorized_user"),
		)

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
		const resolved = await withPostgresClient(TEST_DATABASE_URL, (client) =>
			createPostgresAuthorizationStore(client).findByClerkUserId("clerk_missing_membership"),
		)

		// Assert
		expect(resolved).toBeNull()
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
