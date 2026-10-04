import type { Client } from "pg"
import type { BudgetPeriod } from "../../../domain/budget/entities/budget-period"
import type { BudgetPeriodRepository } from "../../../domain/budget/repositories/budget-period-repository"
import type { HouseholdId } from "../../../domain/household/value-objects/household-id"

const EXISTS_FOR_HOUSEHOLD_SQL = `
SELECT EXISTS (
  SELECT 1
  FROM public.budget_periods
  WHERE household_id = $1
) AS "exists"
`

const INSERT_BUDGET_PERIOD_SQL = `
INSERT INTO public.budget_periods (household_id, month_start)
VALUES ($1, $2::date)
ON CONFLICT (household_id, month_start) DO NOTHING
`

type ExistsRow = Readonly<{ exists: unknown }>

export class PostgresBudgetPeriodRepository implements BudgetPeriodRepository {
	constructor(private readonly client: Client) {}

	async existsForHousehold(householdId: HouseholdId): Promise<boolean> {
		const result = await this.client.query<ExistsRow>(EXISTS_FOR_HOUSEHOLD_SQL, [householdId.value])
		const exists = result.rows[0]?.exists
		if (typeof exists !== "boolean") {
			throw new Error("Budget period existence query returned an invalid row")
		}

		return exists
	}

	async save(budgetPeriod: BudgetPeriod): Promise<void> {
		await this.client.query(INSERT_BUDGET_PERIOD_SQL, [
			budgetPeriod.householdId.value,
			budgetPeriod.monthStart.value,
		])
	}
}
