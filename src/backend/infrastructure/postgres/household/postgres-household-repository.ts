import type { Client } from "pg"
import { Household } from "../../../domain/household/entities/household"
import type { HouseholdRepository } from "../../../domain/household/repositories/household-repository"
import { HouseholdId } from "../../../domain/household/value-objects/household-id"
import type { UserId } from "../../../domain/user/value-objects/user-id"
import { UserId as DomainUserId } from "../../../domain/user/value-objects/user-id"

type HouseholdRow = Readonly<{
	id: unknown
	personalOwnerUserId: unknown
}>

const SELECT_BY_OWNER_SQL = `
SELECT id::text, personal_owner_user_id::text AS "personalOwnerUserId"
FROM public.households
WHERE personal_owner_user_id = $1
`

const SELECT_BY_MEMBER_SQL = `
SELECT
  households.id::text,
  households.personal_owner_user_id::text AS "personalOwnerUserId"
FROM public.households
JOIN public.household_members
  ON household_members.household_id = households.id
 AND household_members.user_id = households.personal_owner_user_id
WHERE households.personal_owner_user_id = $1
`

const UPSERT_HOUSEHOLD_SQL = `
INSERT INTO public.households (id, personal_owner_user_id)
VALUES ($1, $2)
ON CONFLICT (personal_owner_user_id) DO UPDATE
SET personal_owner_user_id = EXCLUDED.personal_owner_user_id
RETURNING id::text, personal_owner_user_id::text AS "personalOwnerUserId"
`

const LOCK_HOUSEHOLD_SQL = `
SELECT id
FROM public.households
WHERE id = $1
FOR UPDATE
`

function toHousehold(row: HouseholdRow): Household {
	return Household.restore(HouseholdId.from(row.id), DomainUserId.from(row.personalOwnerUserId))
}

export class PostgresHouseholdRepository implements HouseholdRepository {
	constructor(private readonly client: Client) {}

	async findPersonalByOwnerUserId(userId: UserId): Promise<Household | null> {
		const result = await this.client.query<HouseholdRow>(SELECT_BY_OWNER_SQL, [userId.value])
		const row = result.rows[0]
		return row ? toHousehold(row) : null
	}

	async findPersonalByMemberUserId(userId: UserId): Promise<Household | null> {
		const result = await this.client.query<HouseholdRow>(SELECT_BY_MEMBER_SQL, [userId.value])
		const row = result.rows[0]
		return row ? toHousehold(row) : null
	}

	async save(household: Household): Promise<Household> {
		const result = await this.client.query<HouseholdRow>(UPSERT_HOUSEHOLD_SQL, [
			household.id.value,
			household.personalOwnerUserId.value,
		])
		const row = result.rows[0]
		if (!row) {
			throw new Error("Household upsert returned no row")
		}

		return toHousehold(row)
	}

	async lock(householdId: HouseholdId): Promise<void> {
		const result = await this.client.query(LOCK_HOUSEHOLD_SQL, [householdId.value])
		if (result.rowCount !== 1) {
			throw new Error("Household lock target was not found")
		}
	}
}
