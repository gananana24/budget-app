import { Hono, type MiddlewareHandler } from "hono"
import type { ResolveAuthorizationUseCase } from "../../usecase/authorization/resolve-authorization-use-case"
import type { BootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import type { CreateExpenseUseCase } from "../../usecase/expense/create-expense-use-case"
import type { DeleteExpenseUseCase } from "../../usecase/expense/delete-expense-use-case"
import type { UpdateExpenseUseCase } from "../../usecase/expense/update-expense-use-case"
import type { GetMonthlyOverviewUseCase } from "../../usecase/monthly/get-monthly-overview-use-case"
import type { HttpEnvironment } from "./authentication"
import { BootstrapApiRouteHandler } from "./bootstrap/handlers/bootstrap-api-route-handler"
import { domainErrorResponse, notFoundResponse, unexpectedErrorResponse } from "./error-response"
import { ChangeExpenseApiRouteHandler } from "./expense/handlers/change-expense-api-route-handler"
import { CreateExpenseApiRouteHandler } from "./expense/handlers/create-expense-api-route-handler"
import { GetMonthlyOverviewApiRouteHandler } from "./monthly/handlers/get-monthly-overview-api-route-handler"

type HttpAppDependencies = Readonly<{
	authenticationMiddleware: readonly [
		MiddlewareHandler<HttpEnvironment>,
		...MiddlewareHandler<HttpEnvironment>[],
	]
	bootstrapUseCase: BootstrapUseCase
	resolveAuthorizationUseCase: ResolveAuthorizationUseCase
	createExpenseUseCase: CreateExpenseUseCase
	updateExpenseUseCase: UpdateExpenseUseCase
	deleteExpenseUseCase: DeleteExpenseUseCase
	getMonthlyOverviewUseCase: GetMonthlyOverviewUseCase
}>

export function createHttpApp({
	authenticationMiddleware,
	bootstrapUseCase,
	resolveAuthorizationUseCase,
	createExpenseUseCase,
	updateExpenseUseCase,
	deleteExpenseUseCase,
	getMonthlyOverviewUseCase,
}: HttpAppDependencies): Hono<HttpEnvironment> {
	const app = new Hono<HttpEnvironment>()

	app.use("/api/*", ...authenticationMiddleware)
	new BootstrapApiRouteHandler(bootstrapUseCase).registerRoutes(app)
	new CreateExpenseApiRouteHandler(
		resolveAuthorizationUseCase,
		createExpenseUseCase,
	).registerRoutes(app)
	new ChangeExpenseApiRouteHandler(
		resolveAuthorizationUseCase,
		updateExpenseUseCase,
		deleteExpenseUseCase,
	).registerRoutes(app)
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
