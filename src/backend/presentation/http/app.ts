import { Hono, type MiddlewareHandler } from "hono"
import type { AuthenticatedUser } from "../../application/auth/authenticated-user"
import type { AuthorizationContext } from "../../application/auth/authorization-context"
import { ApplicationError } from "../../application/errors/application-error"
import type { HttpEnvironment } from "./authentication"
import { getAuthenticatedUser } from "./authentication"
import {
	applicationErrorResponse,
	notFoundResponse,
	unexpectedErrorResponse,
} from "./error-response"

type HttpAppDependencies = Readonly<{
	authenticationMiddleware: readonly [
		MiddlewareHandler<HttpEnvironment>,
		...MiddlewareHandler<HttpEnvironment>[],
	]
	bootstrap: (user: AuthenticatedUser) => Promise<AuthorizationContext>
}>

export function createHttpApp({
	authenticationMiddleware,
	bootstrap,
}: HttpAppDependencies): Hono<HttpEnvironment> {
	const app = new Hono<HttpEnvironment>()

	app.use("/api/*", ...authenticationMiddleware)
	app.post("/api/bootstrap", async (context) => {
		await bootstrap(getAuthenticatedUser(context))
		return context.body(null, 204)
	})

	app.notFound(notFoundResponse)
	app.onError((error, context) => {
		if (error instanceof ApplicationError) {
			return applicationErrorResponse(error, context)
		}

		return unexpectedErrorResponse(error, context)
	})

	return app
}
