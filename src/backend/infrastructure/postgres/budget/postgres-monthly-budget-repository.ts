import type { Client } from "pg"
import { BudgetLockConflictError } from "../../../domain/budget/exceptions/budget-lock-conflict-error"
import type {
	BudgetAmount,
	BudgetDraft,
	MonthlyBudgetRepository,
} from "../../../domain/budget/repositories/monthly-budget-repository"
import type { MonthStart } from "../../../domain/budget/value-objects/month-start"
import type { CategoryId } from "../../../domain/category/value-objects/category-id"
import type { HouseholdId } from "../../../domain/household/value-objects/household-id"

const INITIALIZE_SQL = `
WITH created AS (
  INSERT INTO public.budget_periods (household_id, month_start)
  VALUES ($1::uuid, $2::date)
  ON CONFLICT (household_id, month_start) DO NOTHING
  RETURNING month_start
), source_period AS (
  SELECT month_start
  FROM public.budget_periods
  WHERE household_id = $1::uuid AND month_start < $2::date
  ORDER BY month_start DESC
  LIMIT 1
)
INSERT INTO public.monthly_budgets
  (household_id, month_start, category_id, amount, created_at, updated_at)
SELECT $1::uuid, created.month_start, budget.category_id, budget.amount, now(), now()
FROM created
CROSS JOIN source_period
JOIN public.monthly_budgets AS budget
  ON budget.household_id = $1::uuid AND budget.month_start = source_period.month_start
ON CONFLICT (household_id, month_start, category_id) DO NOTHING
`

function readDraftRow(value: unknown): BudgetAmount {
	if (typeof value !== "object" || value === null) throw new Error("Invalid budget row")
	const row = value as Record<string, unknown>
	if (
		typeof row.category_id !== "string" ||
		typeof row.amount !== "number" ||
		!Number.isSafeInteger(row.amount)
	) {
		throw new Error("Invalid budget fields")
	}
	return { categoryId: row.category_id, amount: row.amount }
}

export class PostgresMonthlyBudgetRepository implements MonthlyBudgetRepository {
	constructor(private readonly client: Client) {}

	async findDraft(householdId: HouseholdId, month: MonthStart): Promise<BudgetDraft> {
		const period = await this.client.query(
			`SELECT EXISTS (
			   SELECT 1 FROM public.budget_periods
			   WHERE household_id = $1::uuid AND month_start = $2::date
			 ) AS initialized`,
			[householdId.value, month.value],
		)
		const initialized = period.rows[0]?.initialized
		if (typeof initialized !== "boolean") throw new Error("Invalid budget period row")

		const result = await this.client.query(
			`SELECT budget.category_id::text AS category_id, budget.amount
			 FROM public.monthly_budgets AS budget
			 WHERE budget.household_id = $1::uuid
			   AND budget.month_start = CASE WHEN $3::boolean THEN $2::date ELSE (
			     SELECT month_start FROM public.budget_periods
			     WHERE household_id = $1::uuid AND month_start < $2::date
			     ORDER BY month_start DESC LIMIT 1
			   ) END
			 ORDER BY budget.category_id`,
			[householdId.value, month.value, initialized],
		)
		return { month: month.value, initialized, budgets: result.rows.map(readDraftRow) }
	}

	async lockHousehold(householdId: HouseholdId): Promise<void> {
		await this.client.query("SET LOCAL lock_timeout = '3s'")
		try {
			const result = await this.client.query(
				"SELECT id FROM public.households WHERE id = $1::uuid FOR UPDATE",
				[householdId.value],
			)
			if (result.rowCount !== 1) throw new Error("Authorized household no longer exists")
		} catch (error) {
			if (
				typeof error === "object" &&
				error !== null &&
				"code" in error &&
				error.code === "55P03"
			) {
				throw new BudgetLockConflictError()
			}
			throw error
		}
	}

	async initialize(householdId: HouseholdId, month: MonthStart): Promise<void> {
		await this.client.query(INITIALIZE_SQL, [householdId.value, month.value])
	}

	async findAvailableCategoryIds(
		householdId: HouseholdId,
		categoryIds: readonly CategoryId[],
	): Promise<ReadonlySet<string>> {
		const result = await this.client.query(
			`SELECT id::text AS id FROM public.categories
			 WHERE id = ANY($2::uuid[]) AND (household_id IS NULL OR household_id = $1::uuid)
			 FOR KEY SHARE`,
			[householdId.value, categoryIds.map(({ value }) => value)],
		)
		return new Set(
			result.rows.map((row: unknown) => {
				if (
					typeof row !== "object" ||
					row === null ||
					!("id" in row) ||
					typeof row.id !== "string"
				) {
					throw new Error("Invalid category ID row")
				}
				return row.id
			}),
		)
	}

	async save(
		householdId: HouseholdId,
		month: MonthStart,
		budgets: readonly BudgetAmount[],
	): Promise<void> {
		await this.client.query(
			`INSERT INTO public.monthly_budgets
			   (household_id, month_start, category_id, amount)
			 SELECT $1::uuid, $2::date, input.category_id, input.amount
			 FROM unnest($3::uuid[], $4::integer[]) AS input(category_id, amount)
			 ON CONFLICT (household_id, month_start, category_id)
			 DO UPDATE SET amount = EXCLUDED.amount, updated_at = now()`,
			[
				householdId.value,
				month.value,
				budgets.map(({ categoryId }) => categoryId),
				budgets.map(({ amount }) => amount),
			],
		)
	}

	async delete(
		householdId: HouseholdId,
		month: MonthStart,
		categoryId: CategoryId,
	): Promise<boolean> {
		const result = await this.client.query(
			`DELETE FROM public.monthly_budgets
			 WHERE household_id = $1::uuid AND month_start = $2::date AND category_id = $3::uuid
			 RETURNING category_id`,
			[householdId.value, month.value, categoryId.value],
		)
		return result.rowCount === 1
	}
}
