import { describe, expect, it } from "vitest"
import type { BudgetPeriod } from "../../domain/budget/entities/budget-period"
import type { BudgetPeriodRepository } from "../../domain/budget/repositories/budget-period-repository"
import type { HouseholdMembership } from "../../domain/household/entities/household-membership"
import type { HouseholdMembershipRepository } from "../../domain/household/repositories/household-membership-repository"
import type { HouseholdRepository } from "../../domain/household/repositories/household-repository"
import type { UserRepository } from "../../domain/user/repositories/user-repository"
import { ClerkUserId } from "../../domain/user/value-objects/clerk-user-id"
import { DefaultBootstrapUseCase } from "./bootstrap-use-case"

describe("bootstrap", () => {
	it("creates a personal household membership and first budget period", async () => {
		// Arrange
		let savedMembership: HouseholdMembership | undefined
		let savedBudgetPeriod: BudgetPeriod | undefined
		const userRepository: UserRepository = {
			findByClerkUserId: async () => null,
			save: async (user) => user,
		}
		const householdRepository: HouseholdRepository = {
			findPersonalByOwnerUserId: async () => null,
			findPersonalByMemberUserId: async () => null,
			save: async (household) => household,
			lock: async () => undefined,
		}
		const householdMembershipRepository: HouseholdMembershipRepository = {
			save: async (membership) => {
				savedMembership = membership
			},
		}
		const budgetPeriodRepository: BudgetPeriodRepository = {
			existsForHousehold: async () => false,
			save: async (budgetPeriod) => {
				savedBudgetPeriod = budgetPeriod
			},
		}
		const useCase = new DefaultBootstrapUseCase({
			userRepository,
			householdRepository,
			householdMembershipRepository,
			budgetPeriodRepository,
			now: () => new Date("2026-08-31T15:00:00.000Z"),
		})

		// Act
		const result = await useCase.execute(ClerkUserId.from("clerk-user-id"))

		// Assert
		expect(savedMembership?.userId).toEqual(result.userId)
		expect(savedMembership?.householdId).toEqual(result.householdId)
		expect(savedBudgetPeriod?.householdId).toEqual(result.householdId)
		expect(savedBudgetPeriod?.monthStart.value).toBe("2026-09-01")
	})
})
