import type { User } from "../entities/user"
import type { ClerkUserId } from "../value-objects/clerk-user-id"

export interface UserRepository {
	findByClerkUserId(clerkUserId: ClerkUserId): Promise<User | null>
	save(user: User): Promise<User>
}
