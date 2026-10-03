import { clerkMiddleware, getAuth } from "@clerk/hono"
import { createHttpApp } from "../presentation/http/app"
import { createAuthenticatedUserMiddleware } from "../presentation/http/authentication"
import { createWorkerDependencies } from "./dependencies"

export default {
	async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
		const dependencies = createWorkerDependencies(env)
		const app = createHttpApp({
			authenticationMiddleware: [
				clerkMiddleware(),
				createAuthenticatedUserMiddleware((context) => getAuth(context).userId),
			],
			bootstrap: dependencies.bootstrap,
		})

		return await app.fetch(request, env, executionContext)
	},
} satisfies ExportedHandler<Env>
