import { Hono, type MiddlewareHandler } from "hono"
import type { ResolveAuthorizationUseCase } from "../../usecase/authorization/resolve-authorization-use-case"
import type { BootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import type { GetMonthlyOverviewUseCase } from "../../usecase/monthly/get-monthly-overview-use-case"
import type { HttpEnvironment } from "./authentication"
import { BootstrapApiRouteHandler } from "./bootstrap/handlers/bootstrap-api-route-handler"
import { domainErrorResponse, notFoundResponse, unexpectedErrorResponse } from "./error-response"
import { GetMonthlyOverviewApiRouteHandler } from "./monthly/handlers/get-monthly-overview-api-route-handler"

type HttpAppDependencies = Readonly<{
	authenticationMiddleware: readonly [
		MiddlewareHandler<HttpEnvironment>,
		...MiddlewareHandler<HttpEnvironment>[],
	]
	bootstrapUseCase: BootstrapUseCase
	resolveAuthorizationUseCase: ResolveAuthorizationUseCase
	getMonthlyOverviewUseCase: GetMonthlyOverviewUseCase
}>

export function createHttpApp({
	authenticationMiddleware,
	bootstrapUseCase,
	resolveAuthorizationUseCase,
	getMonthlyOverviewUseCase,
}: HttpAppDependencies): Hono<HttpEnvironment> {
	const app = new Hono<HttpEnvironment>()

	app.use("/api/*", ...authenticationMiddleware)
	new BootstrapApiRouteHandler(bootstrapUseCase).registerRoutes(app)
	new GetMonthlyOverviewApiRouteHandler(
		resolveAuthorizationUseCase,
		getMonthlyOverviewUseCase,
	).registerRoutes(app)

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
