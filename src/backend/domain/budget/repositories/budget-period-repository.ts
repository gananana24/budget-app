import type { HouseholdId } from "../../household/value-objects/household-id"
import type { BudgetPeriod } from "../entities/budget-period"

export interface BudgetPeriodRepository {
	existsForHousehold(householdId: HouseholdId): Promise<boolean>
	save(budgetPeriod: BudgetPeriod): Promise<void>
}
