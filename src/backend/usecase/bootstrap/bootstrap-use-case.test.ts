import { describe, expect, it } from "vitest"
import type { HouseholdMembership } from "../../domain/household/entities/household-membership"
import type { HouseholdMembershipRepository } from "../../domain/household/repositories/household-membership-repository"
import type { HouseholdRepository } from "../../domain/household/repositories/household-repository"
import type { UserRepository } from "../../domain/user/repositories/user-repository"
import { ClerkUserId } from "../../domain/user/value-objects/clerk-user-id"
import { DefaultBootstrapUseCase } from "./bootstrap-use-case"

describe("bootstrap", () => {
	it("creates a personal household membership", async () => {
		// Arrange
		let savedMembership: HouseholdMembership | undefined
		const userRepository: UserRepository = {
			findByClerkUserId: async () => null,
			save: async (user) => user,
		}
		const householdRepository: HouseholdRepository = {
			findPersonalByOwnerUserId: async () => null,
			findPersonalByMemberUserId: async () => null,
			save: async (household) => household,
		}
		const householdMembershipRepository: HouseholdMembershipRepository = {
			save: async (membership) => {
				savedMembership = membership
			},
		}
		const useCase = new DefaultBootstrapUseCase({
			userRepository,
			householdRepository,
			householdMembershipRepository,
		})

		// Act
		const result = await useCase.execute(ClerkUserId.from("clerk-user-id"))

		// Assert
		expect(savedMembership?.userId).toEqual(result.userId)
		expect(savedMembership?.householdId).toEqual(result.householdId)
	})
})
