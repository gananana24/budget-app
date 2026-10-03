import { ApplicationError } from "../errors/application-error"
import type { AuthenticatedUser } from "./authenticated-user"
import type { AuthorizationContext } from "./authorization-context"

export interface AuthorizationStore {
	findByClerkUserId(clerkUserId: string): Promise<AuthorizationContext | null>
}

type ResolveAuthorizationDependencies = Readonly<{
	store: AuthorizationStore
}>

export function createResolveAuthorization({ store }: ResolveAuthorizationDependencies) {
	return async (user: AuthenticatedUser): Promise<AuthorizationContext> => {
		const authorization = await store.findByClerkUserId(user.clerkUserId)
		if (!authorization) {
			throw new ApplicationError("BOOTSTRAP_REQUIRED")
		}

		return authorization
	}
}
