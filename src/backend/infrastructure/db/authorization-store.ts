import type { Client } from "pg"
import type { AuthorizationContext } from "../../application/auth/authorization-context"
import type { AuthorizationStore } from "../../application/auth/resolve-authorization"

const SELECT_AUTHORIZATION_SQL = `
SELECT
  users.id::text AS "userId",
  households.id::text AS "householdId"
FROM public.users
JOIN public.households
  ON households.personal_owner_user_id = users.id
JOIN public.household_members
  ON household_members.household_id = households.id
 AND household_members.user_id = users.id
WHERE users.clerk_user_id = $1
`

export function createPostgresAuthorizationStore(client: Client): AuthorizationStore {
	return {
		async findByClerkUserId(clerkUserId: string): Promise<AuthorizationContext | null> {
			const result = await client.query(SELECT_AUTHORIZATION_SQL, [clerkUserId])
			const row = result.rows[0]
			if (!row) {
				return null
			}
			if (typeof row.userId !== "string" || typeof row.householdId !== "string") {
				throw new Error("Authorization query returned an invalid context")
			}

			return { userId: row.userId, householdId: row.householdId }
		},
	}
}
