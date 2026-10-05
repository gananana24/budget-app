import type { Client } from "pg"
import type { MonthStart } from "../../../domain/budget/value-objects/month-start"
import type { HouseholdId } from "../../../domain/household/value-objects/household-id"
import type {
	MonthlyCategoryRecord,
	MonthlyExpenseRecord,
	MonthlyOverviewRecord,
	MonthlyOverviewRepository,
} from "../../../domain/monthly/repositories/monthly-overview-repository"

const CATEGORY_SQL = `
SELECT
  categories.id::text AS id,
  categories.name,
  monthly_budgets.amount AS budget_amount,
  COALESCE(SUM(expenses.amount), 0)::text AS expense_amount
FROM public.categories
LEFT JOIN public.monthly_budgets
  ON monthly_budgets.household_id = $1::uuid
  AND monthly_budgets.category_id = categories.id
  AND monthly_budgets.month_start = $2::date
LEFT JOIN public.expenses
  ON expenses.household_id = $1::uuid
  AND expenses.category_id = categories.id
  AND expenses.expense_date >= $2::date
  AND expenses.expense_date < ($2::date + INTERVAL '1 month')
WHERE categories.household_id IS NULL
  OR categories.household_id = $1::uuid
GROUP BY
  categories.id,
  categories.name,
  categories.household_id,
  categories.seed_key,
  categories.created_at,
  monthly_budgets.amount
ORDER BY
  CASE categories.seed_key
    WHEN 'food' THEN 1
    WHEN 'daily_goods' THEN 2
    WHEN 'housing' THEN 3
    WHEN 'utilities' THEN 4
    WHEN 'communications' THEN 5
    WHEN 'transportation' THEN 6
    WHEN 'medical' THEN 7
    WHEN 'entertainment' THEN 8
    WHEN 'other' THEN 9
    ELSE 10
  END,
  categories.created_at,
  categories.id
`

const EXPENSE_SQL = `
SELECT
  id::text AS id,
  expense_date::text AS date,
  amount,
  category_id::text AS category_id,
  memo,
  created_at::text AS created_at,
  updated_at::text AS updated_at
FROM public.expenses
WHERE household_id = $1::uuid
  AND expense_date >= $2::date
  AND expense_date < ($2::date + INTERVAL '1 month')
ORDER BY expense_date DESC, created_at DESC, id DESC
`

const TOTALS_SQL = `
SELECT
  EXISTS (
    SELECT 1
    FROM public.budget_periods
    WHERE household_id = $1::uuid
      AND month_start = $2::date
  ) AS initialized,
  COALESCE((
    SELECT SUM(amount)
    FROM public.monthly_budgets
    WHERE household_id = $1::uuid
      AND month_start = $2::date
  ), 0)::text AS total_budget_amount,
  COALESCE((
    SELECT SUM(amount)
    FROM public.expenses
    WHERE household_id = $1::uuid
      AND expense_date >= $2::date
      AND expense_date < ($2::date + INTERVAL '1 month')
  ), 0)::text AS total_expense_amount,
  COALESCE((
    SELECT SUM(amount)
    FROM public.expenses
    WHERE household_id = $1::uuid
      AND category_id IS NULL
      AND expense_date >= $2::date
      AND expense_date < ($2::date + INTERVAL '1 month')
  ), 0)::text AS uncategorized_expense_amount
`

function readSafeInteger(value: unknown, field: string): number {
	const result = typeof value === "number" ? value : Number(value)
	if (!Number.isSafeInteger(result)) {
		throw new Error(`${field} is not a safe integer`)
	}
	return result
}

function readRecord(value: unknown, errorMessage: string): Record<string, unknown> {
	if (typeof value !== "object" || value === null) {
		throw new Error(errorMessage)
	}
	return value as Record<string, unknown>
}

function readCategory(value: unknown): MonthlyCategoryRecord {
	const row = readRecord(value, "Category query returned an invalid row")
	if (typeof row.id !== "string" || typeof row.name !== "string") {
		throw new Error("Category query returned invalid category fields")
	}

	return {
		id: row.id,
		name: row.name,
		budgetAmount:
			row.budget_amount === null ? null : readSafeInteger(row.budget_amount, "category budget"),
		expenseAmount: readSafeInteger(row.expense_amount, "category expenses"),
	}
}

function readNullableString(value: unknown, field: string): string | null {
	if (value === null || typeof value === "string") {
		return value
	}
	throw new Error(`${field} is not a nullable string`)
}

function readExpense(value: unknown): MonthlyExpenseRecord {
	const row = readRecord(value, "Expense query returned an invalid row")
	if (
		typeof row.id !== "string" ||
		typeof row.date !== "string" ||
		typeof row.created_at !== "string" ||
		typeof row.updated_at !== "string"
	) {
		throw new Error("Expense query returned invalid expense fields")
	}

	return {
		id: row.id,
		date: row.date,
		amount: readSafeInteger(row.amount, "expense amount"),
		categoryId: readNullableString(row.category_id, "expense category"),
		memo: readNullableString(row.memo, "expense memo"),
		createdAt: row.created_at,
		updatedAt: row.updated_at,
	}
}

export class PostgresMonthlyOverviewRepository implements MonthlyOverviewRepository {
	constructor(private readonly client: Client) {}

	async findByMonth(householdId: HouseholdId, month: MonthStart): Promise<MonthlyOverviewRecord> {
		const parameters = [householdId.value, month.value]
		const categoryResult = await this.client.query(CATEGORY_SQL, parameters)
		const expenseResult = await this.client.query(EXPENSE_SQL, parameters)
		const totalsResult = await this.client.query(TOTALS_SQL, parameters)
		const totals = readRecord(totalsResult.rows[0], "Totals query returned an invalid row")
		if (typeof totals.initialized !== "boolean") {
			throw new Error("Totals query returned an invalid initialized field")
		}

		return {
			initialized: totals.initialized,
			totalBudgetAmount: readSafeInteger(totals.total_budget_amount, "total budget"),
			totalExpenseAmount: readSafeInteger(totals.total_expense_amount, "total expenses"),
			uncategorizedExpenseAmount: readSafeInteger(
				totals.uncategorized_expense_amount,
				"uncategorized expenses",
			),
			categories: categoryResult.rows.map(readCategory),
			expenses: expenseResult.rows.map(readExpense),
		}
	}
}
