import { describe, expect, it } from "vitest"
import { type AuthorizationStore, createResolveAuthorization } from "./resolve-authorization"

describe("resolve authorization", () => {
	it("returns the application user and personal household", async () => {
		// Arrange
		const store: AuthorizationStore = {
			findByClerkUserId: async () => ({
				userId: "user-id",
				householdId: "household-id",
			}),
		}
		const resolveAuthorization = createResolveAuthorization({ store })

		// Act
		const result = await resolveAuthorization({ clerkUserId: "clerk-user-id" })

		// Assert
		expect(result).toEqual({ userId: "user-id", householdId: "household-id" })
	})

	it("requires bootstrap when the authenticated user has no personal household", async () => {
		// Arrange
		const store: AuthorizationStore = {
			findByClerkUserId: async () => null,
		}
		const resolveAuthorization = createResolveAuthorization({ store })

		// Act
		const result = resolveAuthorization({ clerkUserId: "clerk-user-id" })

		// Assert
		await expect(result).rejects.toMatchObject({ code: "BOOTSTRAP_REQUIRED" })
	})
})
