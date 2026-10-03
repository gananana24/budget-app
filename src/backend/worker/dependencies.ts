import { createResolveAuthorization } from "../application/auth/resolve-authorization"
import { createBootstrap } from "../application/bootstrap"
import { createPostgresAuthorizationStore } from "../infrastructure/db/authorization-store"
import { createPostgresBootstrapStore } from "../infrastructure/db/bootstrap-store"
import { withPostgresClient } from "../infrastructure/db/postgres"

type DatabaseEnv = Pick<Env, "DATABASE">

export function createWorkerDependencies(env: DatabaseEnv) {
	const connectionString = env.DATABASE.connectionString

	return {
		bootstrap: createBootstrap({
			now: () => new Date(),
			store: {
				bootstrap: (input) =>
					withPostgresClient(connectionString, (client) =>
						createPostgresBootstrapStore(client).bootstrap(input),
					),
			},
		}),
		resolveAuthorization: createResolveAuthorization({
			store: {
				findByClerkUserId: (clerkUserId) =>
					withPostgresClient(connectionString, (client) =>
						createPostgresAuthorizationStore(client).findByClerkUserId(clerkUserId),
					),
			},
		}),
	}
}
