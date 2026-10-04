import { Hono, type MiddlewareHandler } from "hono"
import type { BootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import type { HttpEnvironment } from "./authentication"
import { BootstrapApiRouteHandler } from "./bootstrap/handlers/bootstrap-api-route-handler"
import { domainErrorResponse, notFoundResponse, unexpectedErrorResponse } from "./error-response"

type HttpAppDependencies = Readonly<{
	authenticationMiddleware: readonly [
		MiddlewareHandler<HttpEnvironment>,
		...MiddlewareHandler<HttpEnvironment>[],
	]
	bootstrapUseCase: BootstrapUseCase
}>

export function createHttpApp({
	authenticationMiddleware,
	bootstrapUseCase,
}: HttpAppDependencies): Hono<HttpEnvironment> {
	const app = new Hono<HttpEnvironment>()

	app.use("/api/*", ...authenticationMiddleware)
	new BootstrapApiRouteHandler(bootstrapUseCase).registerRoutes(app)

	app.notFound(notFoundResponse)
	app.onError((error, context) => {
		const domainResponse = domainErrorResponse(error, context)
		if (domainResponse) {
			return domainResponse
		}

		return unexpectedErrorResponse(error, context)
	})

	return app
}
