import type { HouseholdId } from "../../household/value-objects/household-id"
import type { Expense } from "../entities/expense"
import type { ExpenseId } from "../value-objects/expense-id"

export interface ExpenseRepository {
	save(expense: Expense): Promise<void>
	update(expense: Expense): Promise<boolean>
	delete(householdId: HouseholdId, expenseId: ExpenseId): Promise<boolean>
}
