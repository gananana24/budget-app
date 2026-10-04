import type { UserId } from "../../user/value-objects/user-id"
import type { HouseholdId } from "./household-id"

export class AuthorizationContext {
	constructor(
		readonly userId: UserId,
		readonly householdId: HouseholdId,
	) {}
}
