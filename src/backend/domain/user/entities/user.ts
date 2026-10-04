import type { ClerkUserId } from "../value-objects/clerk-user-id"
import { UserId } from "../value-objects/user-id"

export class User {
	private constructor(
		readonly id: UserId,
		readonly clerkUserId: ClerkUserId,
	) {}

	static create(clerkUserId: ClerkUserId): User {
		return new User(UserId.generate(), clerkUserId)
	}

	static restore(id: UserId, clerkUserId: ClerkUserId): User {
		return new User(id, clerkUserId)
	}

	equals(other: User): boolean {
		return this.id.equals(other.id)
	}
}
