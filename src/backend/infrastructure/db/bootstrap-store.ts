import type { Client } from "pg"
import type { AuthorizationContext } from "../../application/auth/authorization-context"
import type { BootstrapInput, BootstrapStore } from "../../application/bootstrap"

const INSERT_USER_SQL = `
INSERT INTO public.users (clerk_user_id)
VALUES ($1)
ON CONFLICT (clerk_user_id) DO NOTHING
`

const INSERT_HOUSEHOLD_SQL = `
INSERT INTO public.households (personal_owner_user_id)
SELECT id
FROM public.users
WHERE clerk_user_id = $1
ON CONFLICT (personal_owner_user_id) DO NOTHING
`

const LOCK_PERSONAL_HOUSEHOLD_SQL = `
SELECT households.id
FROM public.users
JOIN public.households
  ON households.personal_owner_user_id = users.id
WHERE users.clerk_user_id = $1
FOR UPDATE OF households
`

const INSERT_MEMBERSHIP_SQL = `
INSERT INTO public.household_members (household_id, user_id)
SELECT households.id, users.id
FROM public.users
JOIN public.households
  ON households.personal_owner_user_id = users.id
WHERE users.clerk_user_id = $1
ON CONFLICT (household_id, user_id) DO NOTHING
`

const INSERT_FIRST_BUDGET_PERIOD_SQL = `
INSERT INTO public.budget_periods (household_id, month_start)
SELECT households.id, $2::date
FROM public.users
JOIN public.households
  ON households.personal_owner_user_id = users.id
WHERE users.clerk_user_id = $1
  AND NOT EXISTS (
    SELECT 1
    FROM public.budget_periods
    WHERE budget_periods.household_id = households.id
  )
ON CONFLICT (household_id, month_start) DO NOTHING
`

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

function readAuthorizationContext(value: unknown): AuthorizationContext {
	if (!value || typeof value !== "object") {
		throw new Error("Bootstrap query returned no authorization context")
	}

	const row = value as Record<string, unknown>
	if (typeof row.userId !== "string" || typeof row.householdId !== "string") {
		throw new Error("Bootstrap query returned an invalid authorization context")
	}

	return { userId: row.userId, householdId: row.householdId }
}

export function createPostgresBootstrapStore(client: Client): BootstrapStore {
	return {
		async bootstrap(input: BootstrapInput): Promise<AuthorizationContext> {
			await client.query("BEGIN")

			try {
				await client.query(INSERT_USER_SQL, [input.clerkUserId])
				await client.query(INSERT_HOUSEHOLD_SQL, [input.clerkUserId])
				await client.query(LOCK_PERSONAL_HOUSEHOLD_SQL, [input.clerkUserId])
				await client.query(INSERT_MEMBERSHIP_SQL, [input.clerkUserId])
				await client.query(INSERT_FIRST_BUDGET_PERIOD_SQL, [input.clerkUserId, input.monthStart])
				const authorization = await client.query(SELECT_AUTHORIZATION_SQL, [input.clerkUserId])
				const result = readAuthorizationContext(authorization.rows[0])

				await client.query("COMMIT")
				return result
			} catch (error) {
				await client.query("ROLLBACK")
				throw error
			}
		},
	}
}
