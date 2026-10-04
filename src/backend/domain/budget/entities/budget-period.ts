import type { HouseholdId } from "../../household/value-objects/household-id"
import type { MonthStart } from "../value-objects/month-start"

export class BudgetPeriod {
	constructor(
		readonly householdId: HouseholdId,
		readonly monthStart: MonthStart,
	) {}

	equals(other: BudgetPeriod): boolean {
		return this.householdId.equals(other.householdId) && this.monthStart.equals(other.monthStart)
	}
}
