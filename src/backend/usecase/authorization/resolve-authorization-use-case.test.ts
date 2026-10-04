import { describe, expect, it } from "vitest"
import { BootstrapRequiredError } from "../../domain/authorization/exceptions/bootstrap-required-error"
import { Household } from "../../domain/household/entities/household"
import type { HouseholdRepository } from "../../domain/household/repositories/household-repository"
import { User } from "../../domain/user/entities/user"
import type { UserRepository } from "../../domain/user/repositories/user-repository"
import { ClerkUserId } from "../../domain/user/value-objects/clerk-user-id"
import { DefaultResolveAuthorizationUseCase } from "./resolve-authorization-use-case"

describe("resolve authorization", () => {
	it("returns the application user and personal household", async () => {
		// Arrange
		const user = User.create(ClerkUserId.from("clerk-user-id"))
		const household = Household.createPersonal(user.id)
		const userRepository: UserRepository = {
			findByClerkUserId: async () => user,
			save: async (value) => value,
		}
		const householdRepository: HouseholdRepository = {
			findPersonalByOwnerUserId: async () => household,
			findPersonalByMemberUserId: async () => household,
			save: async (value) => value,
			lock: async () => undefined,
		}
		const useCase = new DefaultResolveAuthorizationUseCase({
			userRepository,
			householdRepository,
		})

		// Act
		const result = await useCase.execute(ClerkUserId.from("clerk-user-id"))

		// Assert
		expect(result.userId).toEqual(user.id)
		expect(result.householdId).toEqual(household.id)
	})

	it("requires bootstrap when the authenticated user has no personal household", async () => {
		// Arrange
		const userRepository: UserRepository = {
			findByClerkUserId: async () => null,
			save: async (value) => value,
		}
		const householdRepository: HouseholdRepository = {
			findPersonalByOwnerUserId: async () => null,
			findPersonalByMemberUserId: async () => null,
			save: async (value) => value,
			lock: async () => undefined,
		}
		const useCase = new DefaultResolveAuthorizationUseCase({
			userRepository,
			householdRepository,
		})

		// Act
		const result = useCase.execute(ClerkUserId.from("clerk-user-id"))

		// Assert
		await expect(result).rejects.toBeInstanceOf(BootstrapRequiredError)
	})
})
