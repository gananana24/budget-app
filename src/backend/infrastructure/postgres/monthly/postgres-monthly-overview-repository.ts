import type { Client } from "pg"
import type { HouseholdId } from "../../../domain/household/value-objects/household-id"
import type {
	MonthlyCategoryRecord,
	MonthlyExpenseRecord,
	MonthlyOverviewRecord,
	MonthlyOverviewRepository,
} from "../../../domain/monthly/repositories/monthly-overview-repository"
import type { MonthStart } from "../../../domain/monthly/value-objects/month-start"

const CATEGORY_SQL = `
SELECT
  categories.id::text AS id,
  categories.name,
  categories.seed_key,
  categories.icon_name,
  COALESCE(SUM(expenses.amount), 0)::text AS expense_amount
FROM public.categories
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
  categories.icon_name,
  categories.household_id,
  categories.seed_key,
  categories.created_at
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
  expenses.id::text AS id,
  expenses.expense_date::text AS date,
  expenses.amount,
  expenses.category_id::text AS category_id,
  expenses.memo,
  expenses.created_at::text AS created_at,
  expenses.updated_at::text AS updated_at,
  occurrences.subscription_id::text AS source_subscription_id,
  (subscriptions.ended_at IS NULL AND subscriptions.id IS NOT NULL) AS source_subscription_active
FROM public.expenses
LEFT JOIN public.subscription_occurrences AS occurrences
  ON occurrences.expense_id = expenses.id AND occurrences.household_id = expenses.household_id
LEFT JOIN public.subscriptions
  ON subscriptions.id = occurrences.subscription_id AND subscriptions.household_id = expenses.household_id
WHERE expenses.household_id = $1::uuid
  AND expenses.expense_date >= $2::date
  AND expenses.expense_date < ($2::date + INTERVAL '1 month')
ORDER BY expenses.expense_date DESC, expenses.created_at DESC, expenses.id DESC
`

const TOTALS_SQL = `
SELECT
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
	if (
		typeof row.id !== "string" ||
		typeof row.name !== "string" ||
		(row.seed_key !== null && typeof row.seed_key !== "string") ||
		typeof row.icon_name !== "string"
	) {
		throw new Error("Category query returned invalid category fields")
	}

	return {
		id: row.id,
		name: row.name,
		seedKey: row.seed_key,
		iconName: row.icon_name,
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
		typeof row.updated_at !== "string" ||
		typeof row.source_subscription_active !== "boolean"
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
		sourceSubscriptionId: readNullableString(row.source_subscription_id, "source subscription"),
		sourceSubscriptionActive: row.source_subscription_active,
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
		return {
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
