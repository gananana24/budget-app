import type { Expense } from "../entities/expense"

export interface ExpenseRepository {
	save(expense: Expense): Promise<void>
}
