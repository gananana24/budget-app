import { Hono, type MiddlewareHandler } from "hono"
import { ApplicationError } from "../../application/errors/application-error"
import type { HttpEnvironment } from "./authentication"
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
}>

export function createHttpApp({
	authenticationMiddleware,
}: HttpAppDependencies): Hono<HttpEnvironment> {
	const app = new Hono<HttpEnvironment>()

	app.use("/api/*", ...authenticationMiddleware)

	app.notFound(notFoundResponse)
	app.onError((error, context) => {
		if (error instanceof ApplicationError) {
			return applicationErrorResponse(error, context)
		}

		return unexpectedErrorResponse(error, context)
	})

	return app
}
