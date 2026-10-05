import type { Client, QueryResult } from "pg"
import type { Expense } from "../../../domain/expense/entities/expense"
import { ExpenseCategoryNotFoundError } from "../../../domain/expense/exceptions/expense-category-not-found-error"
import type { ExpenseRepository } from "../../../domain/expense/repositories/expense-repository"

const SAVE_EXPENSE_SQL = `
INSERT INTO public.expenses (id, household_id, category_id, expense_date, amount, memo)
SELECT $1::uuid, $2::uuid, $3::uuid, $4::date, $5::integer, $6::text
WHERE $3::uuid IS NULL
   OR EXISTS (
     SELECT 1
     FROM public.categories
     WHERE categories.id = $3::uuid
       AND (
         categories.household_id IS NULL
         OR categories.household_id = $2::uuid
       )
   )
RETURNING id
`

export class PostgresExpenseRepository implements ExpenseRepository {
	constructor(private readonly client: Client) {}

	async save(expense: Expense): Promise<void> {
		const save = async (): Promise<QueryResult> => {
			try {
				return await this.client.query(SAVE_EXPENSE_SQL, [
					expense.id.value,
					expense.householdId.value,
					expense.categoryId?.value ?? null,
					expense.date,
					expense.amount,
					expense.memo,
				])
			} catch (error) {
				// A category can be removed after the availability check but before the insert's FK check.
				if (
					typeof error === "object" &&
					error !== null &&
					"code" in error &&
					error.code === "23503" &&
					"constraint" in error &&
					error.constraint === "expenses_category_id_fkey"
				) {
					throw new ExpenseCategoryNotFoundError()
				}
				throw error
			}
		}
		const result = await save()

		if (result.rowCount !== 1) {
			throw new ExpenseCategoryNotFoundError()
		}
	}
}
