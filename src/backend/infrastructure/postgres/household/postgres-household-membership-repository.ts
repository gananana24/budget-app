import type { Client } from "pg"
import type { HouseholdMembership } from "../../../domain/household/entities/household-membership"
import type { HouseholdMembershipRepository } from "../../../domain/household/repositories/household-membership-repository"

const INSERT_MEMBERSHIP_SQL = `
INSERT INTO public.household_members (household_id, user_id)
VALUES ($1, $2)
ON CONFLICT (household_id, user_id) DO NOTHING
`

export class PostgresHouseholdMembershipRepository implements HouseholdMembershipRepository {
	constructor(private readonly client: Client) {}

	async save(membership: HouseholdMembership): Promise<void> {
		await this.client.query(INSERT_MEMBERSHIP_SQL, [
			membership.householdId.value,
			membership.userId.value,
		])
	}
}
