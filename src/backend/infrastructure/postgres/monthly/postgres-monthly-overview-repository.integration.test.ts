import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { ClerkUserId } from "../../../domain/user/value-objects/clerk-user-id"
import { DefaultBootstrapUseCase } from "../../../usecase/bootstrap/bootstrap-use-case"
import { DefaultGetMonthlyOverviewUseCase } from "../../../usecase/monthly/get-monthly-overview-use-case"
import { PostgresBudgetPeriodRepository } from "../budget/postgres-budget-period-repository"
import { withPostgresReadTransaction, withPostgresTransaction } from "../database"
import { PostgresHouseholdMembershipRepository } from "../household/postgres-household-membership-repository"
import { PostgresHouseholdRepository } from "../household/postgres-household-repository"
import { PostgresUserRepository } from "../user/postgres-user-repository"
import { PostgresMonthlyOverviewRepository } from "./postgres-monthly-overview-repository"

const DEFAULT_TEST_DATABASE_URL =
	"postgresql://postgres:postgres@127.0.0.1:54322/budget_app_test?sslmode=disable"
const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL

function requireDedicatedTestDatabase(connectionString: string): void {
	const databaseName = new URL(connectionString).pathname.slice(1)
	if (!databaseName.endsWith("_test")) {
		throw new Error("Integration tests require a database whose name ends with _test")
	}
}

async function bootstrap(clerkUserId: string) {
	return withPostgresTransaction(TEST_DATABASE_URL, (client) =>
		new DefaultBootstrapUseCase({
			userRepository: new PostgresUserRepository(client),
			householdRepository: new PostgresHouseholdRepository(client),
			householdMembershipRepository: new PostgresHouseholdMembershipRepository(client),
			budgetPeriodRepository: new PostgresBudgetPeriodRepository(client),
			now: () => new Date("2026-09-15T00:00:00.000Z"),
		}).execute(ClerkUserId.from(clerkUserId)),
	)
}

async function getMonthlyOverview(
	authorization: Awaited<ReturnType<typeof bootstrap>>,
	month: string,
) {
	return withPostgresReadTransaction(TEST_DATABASE_URL, (client) =>
		new DefaultGetMonthlyOverviewUseCase({
			monthlyOverviewRepository: new PostgresMonthlyOverviewRepository(client),
			now: () => new Date("2026-09-30T14:59:59.999Z"),
		}).execute({ authorization, month }),
	)
}

requireDedicatedTestDatabase(TEST_DATABASE_URL)

describe("monthly overview with PostgreSQL", () => {
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

	it("returns ordered expenses and isolated aggregates with distinct budget states", async () => {
		// Arrange
		const [authorization, otherAuthorization] = await Promise.all([
			bootstrap("clerk_monthly_owner"),
			bootstrap("clerk_monthly_other"),
		])
		const foodCategory = await inspectionClient.query(
			"SELECT id FROM public.categories WHERE seed_key = 'food'",
		)
		const foodCategoryId = foodCategory.rows[0].id
		const customCategory = await inspectionClient.query(
			`INSERT INTO public.categories (household_id, name, created_at)
			 VALUES ($1, '予備費', '2026-09-01T00:00:00.000Z')
			 RETURNING id`,
			[authorization.householdId.value],
		)
		await inspectionClient.query(
			`INSERT INTO public.categories (household_id, name)
			 VALUES ($1, '他家計専用')`,
			[otherAuthorization.householdId.value],
		)
		await inspectionClient.query(
			`INSERT INTO public.monthly_budgets (household_id, month_start, category_id, amount)
			 VALUES
			   ($1, '2026-09-01', $2, 1000),
			   ($1, '2026-09-01', $3, 0),
			   ($4, '2026-09-01', $2, 20000)`,
			[
				authorization.householdId.value,
				foodCategoryId,
				customCategory.rows[0].id,
				otherAuthorization.householdId.value,
			],
		)
		await inspectionClient.query(
			`INSERT INTO public.expenses
			   (id, household_id, category_id, expense_date, amount, memo, created_at, updated_at)
			 VALUES
			   ('00000000-0000-4000-8000-000000000001', $1, $2, '2026-09-21', 300, null,
			    '2026-09-21T11:00:00.000Z', '2026-09-21T11:00:00.000Z'),
			   ('00000000-0000-4000-8000-000000000002', $1, $2, '2026-09-21', 500, '夕食',
			    '2026-09-21T11:00:00.000Z', '2026-09-21T11:00:00.000Z'),
			   ('00000000-0000-4000-8000-000000000003', $1, null, '2026-09-22', 500, null,
			    '2026-09-20T00:00:00.000Z', '2026-09-20T00:00:00.000Z'),
			   ('00000000-0000-4000-8000-000000000004', $3, $2, '2026-09-30', 9999, null,
			    '2026-09-30T00:00:00.000Z', '2026-09-30T00:00:00.000Z'),
			   ('00000000-0000-4000-8000-000000000005', $1, $2, '2026-09-21', 100, null,
			    '2026-09-21T12:00:00.000Z', '2026-09-21T12:00:00.000Z')`,
			[authorization.householdId.value, foodCategoryId, otherAuthorization.householdId.value],
		)

		// Act
		const result = await getMonthlyOverview(authorization, "2026-09-01")

		// Assert
		expect(result.initialized).toBe(true)
		expect(result.totals).toEqual({ budget: 1_000, expenses: 1_400, remaining: -400 })
		expect(result.uncategorized).toEqual({ expenses: 500 })
		expect(result.categories).toHaveLength(10)
		expect(result.categories[0]).toMatchObject({
			name: "食費",
			budget: { status: "set", amount: 1_000 },
			expenses: 900,
			remaining: 100,
		})
		expect(result.categories.at(-1)).toMatchObject({
			name: "予備費",
			budget: { status: "set", amount: 0 },
			expenses: 0,
			remaining: 0,
		})
		expect(result.categories.find(({ name }) => name === "日用品")).toMatchObject({
			budget: { status: "unset" },
			remaining: null,
		})
		expect(result.categories.some(({ name }) => name === "他家計専用")).toBe(false)
		expect(result.expenses.map(({ id }) => id)).toEqual([
			"00000000-0000-4000-8000-000000000003",
			"00000000-0000-4000-8000-000000000005",
			"00000000-0000-4000-8000-000000000002",
			"00000000-0000-4000-8000-000000000001",
		])
		expect(result.expenses[0].categoryId).toBeNull()
	})

	it("does not initialize a budget period when reading an earlier month", async () => {
		// Arrange
		const authorization = await bootstrap("clerk_monthly_past")
		const periodsBefore = await inspectionClient.query(
			"SELECT month_start::text AS month FROM public.budget_periods WHERE household_id = $1",
			[authorization.householdId.value],
		)

		// Act
		const result = await getMonthlyOverview(authorization, "2026-08-01")

		// Assert
		const periodsAfter = await inspectionClient.query(
			"SELECT month_start::text AS month FROM public.budget_periods WHERE household_id = $1",
			[authorization.householdId.value],
		)
		expect(result.initialized).toBe(false)
		expect(result.categories.every(({ budget }) => budget.status === "unset")).toBe(true)
		expect(periodsAfter.rows).toEqual(periodsBefore.rows)
	})
})
