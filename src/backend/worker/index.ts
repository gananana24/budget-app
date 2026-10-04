import { clerkMiddleware, getAuth } from "@clerk/hono"
import { newWorkerDependencies } from "../infrastructure/di/injection"
import { createHttpApp } from "../presentation/http/app"
import { createAuthenticatedUserMiddleware } from "../presentation/http/authentication"

export default {
	async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
		const dependencies = newWorkerDependencies(env)
		const app = createHttpApp({
			authenticationMiddleware: [
				clerkMiddleware(),
				createAuthenticatedUserMiddleware((context) => getAuth(context).userId),
			],
			bootstrapUseCase: dependencies.bootstrapUseCase,
		})

		return await app.fetch(request, env, executionContext)
	},
} satisfies ExportedHandler<Env>
