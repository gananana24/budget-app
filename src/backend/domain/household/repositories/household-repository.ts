import type { UserId } from "../../user/value-objects/user-id"
import type { Household } from "../entities/household"
import type { HouseholdId } from "../value-objects/household-id"

export interface HouseholdRepository {
	findPersonalByOwnerUserId(userId: UserId): Promise<Household | null>
	findPersonalByMemberUserId(userId: UserId): Promise<Household | null>
	save(household: Household): Promise<Household>
	lock(householdId: HouseholdId): Promise<void>
}
