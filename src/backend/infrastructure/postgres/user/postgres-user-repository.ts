import type { Client } from "pg"
import { User } from "../../../domain/user/entities/user"
import type { UserRepository } from "../../../domain/user/repositories/user-repository"
import { ClerkUserId } from "../../../domain/user/value-objects/clerk-user-id"
import { UserId } from "../../../domain/user/value-objects/user-id"

type UserRow = Readonly<{
	id: unknown
	clerkUserId: unknown
}>

const SELECT_BY_CLERK_USER_ID_SQL = `
SELECT id::text, clerk_user_id AS "clerkUserId"
FROM public.users
WHERE clerk_user_id = $1
`

const UPSERT_USER_SQL = `
INSERT INTO public.users (id, clerk_user_id)
VALUES ($1, $2)
ON CONFLICT (clerk_user_id) DO UPDATE
SET clerk_user_id = EXCLUDED.clerk_user_id
RETURNING id::text, clerk_user_id AS "clerkUserId"
`

function toUser(row: UserRow): User {
	return User.restore(UserId.from(row.id), ClerkUserId.from(row.clerkUserId))
}

export class PostgresUserRepository implements UserRepository {
	constructor(private readonly client: Client) {}

	async findByClerkUserId(clerkUserId: ClerkUserId): Promise<User | null> {
		const result = await this.client.query<UserRow>(SELECT_BY_CLERK_USER_ID_SQL, [
			clerkUserId.value,
		])
		const row = result.rows[0]
		return row ? toUser(row) : null
	}

	async save(user: User): Promise<User> {
		const result = await this.client.query<UserRow>(UPSERT_USER_SQL, [
			user.id.value,
			user.clerkUserId.value,
		])
		const row = result.rows[0]
		if (!row) {
			throw new Error("User upsert returned no row")
		}

		return toUser(row)
	}
}
