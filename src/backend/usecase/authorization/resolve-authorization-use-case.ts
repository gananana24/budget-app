import { BootstrapRequiredError } from "../../domain/authorization/exceptions/bootstrap-required-error"
import type { HouseholdRepository } from "../../domain/household/repositories/household-repository"
import { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import type { UserRepository } from "../../domain/user/repositories/user-repository"
import type { ClerkUserId } from "../../domain/user/value-objects/clerk-user-id"

export interface ResolveAuthorizationUseCase {
	execute(clerkUserId: ClerkUserId): Promise<AuthorizationContext>
}

type ResolveAuthorizationUseCaseDependencies = Readonly<{
	userRepository: UserRepository
	householdRepository: HouseholdRepository
}>

export class DefaultResolveAuthorizationUseCase implements ResolveAuthorizationUseCase {
	constructor(private readonly dependencies: ResolveAuthorizationUseCaseDependencies) {}

	async execute(clerkUserId: ClerkUserId): Promise<AuthorizationContext> {
		const user = await this.dependencies.userRepository.findByClerkUserId(clerkUserId)
		if (!user) {
			throw new BootstrapRequiredError()
		}

		const household = await this.dependencies.householdRepository.findPersonalByMemberUserId(
			user.id,
		)
		if (!household) {
			throw new BootstrapRequiredError()
		}

		return new AuthorizationContext(user.id, household.id)
	}
}
