import { describe, expect, it } from "vitest"
import type { Expense } from "../../domain/expense/entities/expense"
import type { ExpenseRepository } from "../../domain/expense/repositories/expense-repository"
import { ExpenseId } from "../../domain/expense/value-objects/expense-id"
import { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { HouseholdId } from "../../domain/household/value-objects/household-id"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"
import { UserId } from "../../domain/user/value-objects/user-id"
import { DefaultCreateExpenseUseCase } from "./create-expense-use-case"

const EXPENSE_ID = "00000000-0000-4000-8000-000000000010"
const CATEGORY_ID = "00000000-0000-4000-8000-000000000020"

function createAuthorizationContext(): AuthorizationContext {
	return new AuthorizationContext(
		UserId.from("00000000-0000-4000-8000-000000000001"),
		HouseholdId.from("00000000-0000-4000-8000-000000000002"),
	)
}

function createUseCase(savedExpenses: Expense[]) {
	const expenseRepository: ExpenseRepository = {
		save: async (expense) => {
			savedExpenses.push(expense)
		},
	}

	return new DefaultCreateExpenseUseCase({
		expenseRepository,
		newExpenseId: () => ExpenseId.from(EXPENSE_ID),
		now: () => new Date("2026-10-05T14:59:59.999Z"),
	})
}

describe("create expense", () => {
	it("creates an uncategorized expense after normalizing a memo", async () => {
		// Arrange
		const savedExpenses: Expense[] = []
		const useCase = createUseCase(savedExpenses)

		// Act
		const result = await useCase.execute({
			authorization: createAuthorizationContext(),
			date: "2026-10-05",
			amount: 1_200,
			categoryId: null,
			memo: "  夕食  ",
		})

		// Assert
		expect(result).toEqual({
			id: EXPENSE_ID,
			date: "2026-10-05",
			amount: 1_200,
			categoryId: null,
			memo: "夕食",
		})
		expect(savedExpenses).toHaveLength(1)
		expect(savedExpenses[0]).toMatchObject({ memo: "夕食", categoryId: null })
	})

	it("keeps a selected category on the expense", async () => {
		// Arrange
		const savedExpenses: Expense[] = []
		const useCase = createUseCase(savedExpenses)

		// Act
		const result = await useCase.execute({
			authorization: createAuthorizationContext(),
			date: "2026-10-05",
			amount: 500,
			categoryId: CATEGORY_ID,
			memo: " ",
		})

		// Assert
		expect(result.categoryId).toBe(CATEGORY_ID)
		expect(result.memo).toBeNull()
	})

	it.each([
		["date", { date: "2026-10-06", amount: 100, categoryId: null, memo: null }],
		["amount", { date: "2026-10-05", amount: 0, categoryId: null, memo: null }],
		["memo", { date: "2026-10-05", amount: 100, categoryId: null, memo: "食".repeat(501) }],
		["categoryId", { date: "2026-10-05", amount: 100, categoryId: "not-a-uuid", memo: null }],
	] as const)("rejects an invalid %s", async (field, values) => {
		// Arrange
		const useCase = createUseCase([])

		// Act
		const result = useCase.execute({ authorization: createAuthorizationContext(), ...values })

		// Assert
		await expect(result).rejects.toEqual(expect.objectContaining({ field }))
		await expect(result).rejects.toBeInstanceOf(InvalidValueError)
	})
})
