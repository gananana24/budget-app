import { CategoryId } from "../../category/value-objects/category-id"
import type { HouseholdId } from "../../household/value-objects/household-id"
import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { validateExpenseDate } from "../../validation/date"
import { validateExpenseAmount } from "../../validation/money"
import type { ValidationResult } from "../../validation/result"
import { normalizeMemo } from "../../validation/text"
import type { ExpenseId } from "../value-objects/expense-id"

type CreateExpenseValues = Readonly<{
	id: ExpenseId
	householdId: HouseholdId
	categoryId: unknown
	date: unknown
	amount: unknown
	memo: unknown
	todayInTokyo: string
}>

function requireValid<Value>(result: ValidationResult<Value>, field: string): Value {
	if (!result.success) {
		throw new InvalidValueError(result.code, field)
	}

	return result.value
}

function optionalCategoryId(value: unknown): CategoryId | null {
	if (value === null || value === undefined) {
		return null
	}

	return CategoryId.from(value)
}

export class Expense {
	private constructor(
		readonly id: ExpenseId,
		readonly householdId: HouseholdId,
		readonly categoryId: CategoryId | null,
		readonly date: string,
		readonly amount: number,
		readonly memo: string | null,
	) {}

	static create(values: CreateExpenseValues): Expense {
		return new Expense(
			values.id,
			values.householdId,
			optionalCategoryId(values.categoryId),
			requireValid(validateExpenseDate(values.date, values.todayInTokyo), "date"),
			requireValid(validateExpenseAmount(values.amount), "amount"),
			requireValid(normalizeMemo(values.memo), "memo"),
		)
	}

	equals(other: Expense): boolean {
		return this.id.equals(other.id)
	}
}
