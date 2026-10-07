import type { Client, QueryResult } from "pg"
import type { Expense } from "../../../domain/expense/entities/expense"
import { ExpenseCategoryNotFoundError } from "../../../domain/expense/exceptions/expense-category-not-found-error"
import type { ExpenseRepository } from "../../../domain/expense/repositories/expense-repository"
import type { ExpenseId } from "../../../domain/expense/value-objects/expense-id"
import type { HouseholdId } from "../../../domain/household/value-objects/household-id"

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

const UPDATE_EXPENSE_SQL = `
UPDATE public.expenses
SET expense_date = $3::date,
    amount = $4::integer,
    category_id = $5::uuid,
    memo = $6::text,
    updated_at = now()
WHERE id = $1::uuid
  AND household_id = $2::uuid
  AND ($5::uuid IS NULL OR EXISTS (
    SELECT 1 FROM public.categories
    WHERE categories.id = $5::uuid
      AND (categories.household_id IS NULL OR categories.household_id = $2::uuid)
  ))
RETURNING id
`

const DELETE_EXPENSE_SQL = `
DELETE FROM public.expenses
WHERE id = $1::uuid AND household_id = $2::uuid
RETURNING id
`

function translateCategoryForeignKey(error: unknown): never {
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
				translateCategoryForeignKey(error)
			}
		}
		const result = await save()

		if (result.rowCount !== 1) {
			throw new ExpenseCategoryNotFoundError()
		}
	}

	async update(expense: Expense): Promise<boolean> {
		try {
			const result = await this.client.query(UPDATE_EXPENSE_SQL, [
				expense.id.value,
				expense.householdId.value,
				expense.date,
				expense.amount,
				expense.categoryId?.value ?? null,
				expense.memo,
			])
			return result.rowCount === 1
		} catch (error) {
			translateCategoryForeignKey(error)
		}
	}

	async delete(householdId: HouseholdId, expenseId: ExpenseId): Promise<boolean> {
		const result = await this.client.query(DELETE_EXPENSE_SQL, [expenseId.value, householdId.value])
		return result.rowCount === 1
	}
}
