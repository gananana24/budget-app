import type { HouseholdMembership } from "../entities/household-membership"

export interface HouseholdMembershipRepository {
	save(membership: HouseholdMembership): Promise<void>
}
