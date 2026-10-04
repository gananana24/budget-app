import type { UserId } from "../../user/value-objects/user-id"
import type { HouseholdId } from "../value-objects/household-id"

export class HouseholdMembership {
	constructor(
		readonly householdId: HouseholdId,
		readonly userId: UserId,
	) {}

	equals(other: HouseholdMembership): boolean {
		return this.householdId.equals(other.householdId) && this.userId.equals(other.userId)
	}
}
