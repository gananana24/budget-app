import { BudgetPeriod } from "../../domain/budget/entities/budget-period"
import type { BudgetPeriodRepository } from "../../domain/budget/repositories/budget-period-repository"
import { MonthStart } from "../../domain/budget/value-objects/month-start"
import { Household } from "../../domain/household/entities/household"
import { HouseholdMembership } from "../../domain/household/entities/household-membership"
import type { HouseholdMembershipRepository } from "../../domain/household/repositories/household-membership-repository"
import type { HouseholdRepository } from "../../domain/household/repositories/household-repository"
import { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { User } from "../../domain/user/entities/user"
import type { UserRepository } from "../../domain/user/repositories/user-repository"
import type { ClerkUserId } from "../../domain/user/value-objects/clerk-user-id"

export interface BootstrapUseCase {
	execute(clerkUserId: ClerkUserId): Promise<AuthorizationContext>
}

type BootstrapUseCaseDependencies = Readonly<{
	userRepository: UserRepository
	householdRepository: HouseholdRepository
	householdMembershipRepository: HouseholdMembershipRepository
	budgetPeriodRepository: BudgetPeriodRepository
	now: () => Date
}>

export class DefaultBootstrapUseCase implements BootstrapUseCase {
	constructor(private readonly dependencies: BootstrapUseCaseDependencies) {}

	async execute(clerkUserId: ClerkUserId): Promise<AuthorizationContext> {
		const user = await this.findOrCreateUser(clerkUserId)
		const household = await this.findOrCreatePersonalHousehold(user)

		await this.dependencies.householdRepository.lock(household.id)
		await this.dependencies.householdMembershipRepository.save(
			new HouseholdMembership(household.id, user.id),
		)

		const hasBudgetPeriod = await this.dependencies.budgetPeriodRepository.existsForHousehold(
			household.id,
		)
		if (!hasBudgetPeriod) {
			await this.dependencies.budgetPeriodRepository.save(
				new BudgetPeriod(household.id, MonthStart.fromInstantInTokyo(this.dependencies.now())),
			)
		}

		return new AuthorizationContext(user.id, household.id)
	}

	private async findOrCreateUser(clerkUserId: ClerkUserId): Promise<User> {
		const existingUser = await this.dependencies.userRepository.findByClerkUserId(clerkUserId)
		if (existingUser) {
			return existingUser
		}

		return this.dependencies.userRepository.save(User.create(clerkUserId))
	}

	private async findOrCreatePersonalHousehold(user: User): Promise<Household> {
		const existingHousehold = await this.dependencies.householdRepository.findPersonalByOwnerUserId(
			user.id,
		)
		if (existingHousehold) {
			return existingHousehold
		}

		return this.dependencies.householdRepository.save(Household.createPersonal(user.id))
	}
}
