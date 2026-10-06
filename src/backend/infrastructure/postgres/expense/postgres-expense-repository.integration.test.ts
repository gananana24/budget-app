import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { ExpenseCategoryNotFoundError } from "../../../domain/expense/exceptions/expense-category-not-found-error"
import { ExpenseNotFoundError } from "../../../domain/expense/exceptions/expense-not-found-error"
import { ExpenseId } from "../../../domain/expense/value-objects/expense-id"
import { ClerkUserId } from "../../../domain/user/value-objects/clerk-user-id"
import { DefaultBootstrapUseCase } from "../../../usecase/bootstrap/bootstrap-use-case"
import { DefaultCreateExpenseUseCase } from "../../../usecase/expense/create-expense-use-case"
import { DefaultDeleteExpenseUseCase } from "../../../usecase/expense/delete-expense-use-case"
import { DefaultUpdateExpenseUseCase } from "../../../usecase/expense/update-expense-use-case"
import { PostgresBudgetPeriodRepository } from "../budget/postgres-budget-period-repository"
import { withPostgresTransaction } from "../database"
import { PostgresHouseholdMembershipRepository } from "../household/postgres-household-membership-repository"
import { PostgresHouseholdRepository } from "../household/postgres-household-repository"
import { PostgresUserRepository } from "../user/postgres-user-repository"
import { PostgresExpenseRepository } from "./postgres-expense-repository"

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
			now: () => new Date("2026-10-05T00:00:00.000Z"),
		}).execute(ClerkUserId.from(clerkUserId)),
	)
}

async function createExpense(
	authorization: Awaited<ReturnType<typeof bootstrap>>,
	categoryId: string | null,
) {
	return withPostgresTransaction(TEST_DATABASE_URL, (client) =>
		new DefaultCreateExpenseUseCase({
			expenseRepository: new PostgresExpenseRepository(client),
			newExpenseId: ExpenseId.generate,
			now: () => new Date("2026-10-05T00:00:00.000Z"),
		}).execute({
			authorization,
			date: "2026-10-05",
			amount: 1_200,
			categoryId,
			memo: "  夕食  ",
		}),
	)
}

requireDedicatedTestDatabase(TEST_DATABASE_URL)

describe("expense creation with PostgreSQL", () => {
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

	it("stores a normalized uncategorized expense in the authenticated household", async () => {
		// Arrange
		const authorization = await bootstrap("clerk_expense_owner")

		// Act
		const result = await createExpense(authorization, null)

		// Assert
		const stored = await inspectionClient.query(
			`SELECT household_id::text AS household_id, category_id, expense_date::text AS date,
			        amount, memo
			 FROM public.expenses
			 WHERE id = $1::uuid`,
			[result.id],
		)
		expect(stored.rows).toEqual([
			{
				household_id: authorization.householdId.value,
				category_id: null,
				date: "2026-10-05",
				amount: 1_200,
				memo: "夕食",
			},
		])
	})

	it("does not reveal whether a category belongs to another household", async () => {
		// Arrange
		const [authorization, otherAuthorization] = await Promise.all([
			bootstrap("clerk_expense_owner"),
			bootstrap("clerk_expense_other"),
		])
		const category = await inspectionClient.query(
			"INSERT INTO public.categories (household_id, name) VALUES ($1, '他家計') RETURNING id::text",
			[otherAuthorization.householdId.value],
		)

		// Act
		const result = createExpense(authorization, category.rows[0].id)

		// Assert
		await expect(result).rejects.toBeInstanceOf(ExpenseCategoryNotFoundError)
		const count = await inspectionClient.query(
			"SELECT COUNT(*)::integer AS count FROM public.expenses WHERE household_id = $1",
			[authorization.householdId.value],
		)
		expect(count.rows[0].count).toBe(0)
	})

	it("treats a missing category like another household's category", async () => {
		// Arrange
		const authorization = await bootstrap("clerk_expense_missing_category")
		const missingCategoryId = "00000000-0000-4000-8000-000000000099"

		// Act
		const result = createExpense(authorization, missingCategoryId)

		// Assert
		await expect(result).rejects.toBeInstanceOf(ExpenseCategoryNotFoundError)
	})

	it("updates an owned expense across months and physically deletes it", async () => {
		// Arrange
		const authorization = await bootstrap("clerk_expense_editor")
		const expense = await createExpense(authorization, null)
		const update = (input: Parameters<DefaultUpdateExpenseUseCase["execute"]>[0]) =>
			withPostgresTransaction(TEST_DATABASE_URL, (client) =>
				new DefaultUpdateExpenseUseCase(
					new PostgresExpenseRepository(client),
					() => new Date("2026-10-05T00:00:00.000Z"),
				).execute(input),
			)
		const remove = () =>
			withPostgresTransaction(TEST_DATABASE_URL, (client) =>
				new DefaultDeleteExpenseUseCase(new PostgresExpenseRepository(client)).execute({
					authorization,
					expenseId: expense.id,
				}),
			)

		// Act
		const updated = await update({
			authorization,
			expenseId: expense.id,
			date: "2026-09-30",
			amount: 700,
			categoryId: null,
			memo: "  修正  ",
		})
		const afterUpdate = await inspectionClient.query(
			"SELECT expense_date::text AS date, amount, memo FROM public.expenses WHERE id = $1",
			[expense.id],
		)
		await remove()
		const afterDelete = await inspectionClient.query(
			"SELECT id FROM public.expenses WHERE id = $1",
			[expense.id],
		)

		// Assert
		expect(updated).toEqual({
			id: expense.id,
			date: "2026-09-30",
			amount: 700,
			categoryId: null,
			memo: "修正",
		})
		expect(afterUpdate.rows).toEqual([{ date: "2026-09-30", amount: 700, memo: "修正" }])
		expect(afterDelete.rows).toEqual([])
	})

	it("returns the same not-found result for another household's and missing expense IDs", async () => {
		// Arrange
		const owner = await bootstrap("clerk_expense_owner_for_changes")
		const other = await bootstrap("clerk_expense_other_for_changes")
		const expense = await createExpense(other, null)
		const missingId = "00000000-0000-4000-8000-000000000099"
		const update = (expenseId: string) =>
			withPostgresTransaction(TEST_DATABASE_URL, (client) =>
				new DefaultUpdateExpenseUseCase(
					new PostgresExpenseRepository(client),
					() => new Date("2026-10-05T00:00:00.000Z"),
				).execute({
					authorization: owner,
					expenseId,
					date: "2026-10-05",
					amount: 1,
					categoryId: null,
					memo: null,
				}),
			)
		const remove = (expenseId: string) =>
			withPostgresTransaction(TEST_DATABASE_URL, (client) =>
				new DefaultDeleteExpenseUseCase(new PostgresExpenseRepository(client)).execute({
					authorization: owner,
					expenseId,
				}),
			)

		// Act
		const results = await Promise.allSettled([
			update(expense.id),
			update(missingId),
			remove(expense.id),
			remove(missingId),
		])
		const stored = await inspectionClient.query(
			"SELECT amount FROM public.expenses WHERE id = $1",
			[expense.id],
		)

		// Assert
		for (const result of results) {
			expect(result.status).toBe("rejected")
			if (result.status === "rejected") expect(result.reason).toBeInstanceOf(ExpenseNotFoundError)
		}
		expect(stored.rows).toEqual([{ amount: 1_200 }])
	})
})
