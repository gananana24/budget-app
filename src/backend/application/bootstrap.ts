import { getMonthStartInTokyo } from "../domain/calendar"
import type { AuthenticatedUser } from "./auth/authenticated-user"
import type { AuthorizationContext } from "./auth/authorization-context"

export type BootstrapInput = Readonly<{
	clerkUserId: string
	monthStart: string
}>

export interface BootstrapStore {
	bootstrap(input: BootstrapInput): Promise<AuthorizationContext>
}

type BootstrapDependencies = Readonly<{
	store: BootstrapStore
	now: () => Date
}>

export function createBootstrap({ store, now }: BootstrapDependencies) {
	return (user: AuthenticatedUser): Promise<AuthorizationContext> =>
		store.bootstrap({
			clerkUserId: user.clerkUserId,
			monthStart: getMonthStartInTokyo(now()),
		})
}
