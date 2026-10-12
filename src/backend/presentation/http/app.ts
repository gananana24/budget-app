import { Hono, type MiddlewareHandler } from "hono"
import { routePath } from "hono/route"
import type { ResolveAuthorizationUseCase } from "../../usecase/authorization/resolve-authorization-use-case"
import type { BootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import type { CreateCategoryUseCase } from "../../usecase/category/create-category-use-case"
import type { DeleteCategoryUseCase } from "../../usecase/category/delete-category-use-case"
import type { ListCategoriesUseCase } from "../../usecase/category/list-categories-use-case"
import type { UpdateCategoryUseCase } from "../../usecase/category/update-category-use-case"
import type { CreateExpenseUseCase } from "../../usecase/expense/create-expense-use-case"
import type { DeleteExpenseUseCase } from "../../usecase/expense/delete-expense-use-case"
import type { UpdateExpenseUseCase } from "../../usecase/expense/update-expense-use-case"
import type { GetMonthlyOverviewUseCase } from "../../usecase/monthly/get-monthly-overview-use-case"
import type { HttpEnvironment } from "./authentication"
import { BootstrapApiRouteHandler } from "./bootstrap/handlers/bootstrap-api-route-handler"
import { CategoryApiRouteHandler } from "./category/handlers/category-api-route-handler"
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
	listCategoriesUseCase: ListCategoriesUseCase
	createCategoryUseCase: CreateCategoryUseCase
	updateCategoryUseCase: UpdateCategoryUseCase
	deleteCategoryUseCase: DeleteCategoryUseCase
}>

export function createHttpApp({
	authenticationMiddleware,
	bootstrapUseCase,
	resolveAuthorizationUseCase,
	createExpenseUseCase,
	updateExpenseUseCase,
	deleteExpenseUseCase,
	getMonthlyOverviewUseCase,
	listCategoriesUseCase,
	createCategoryUseCase,
	updateCategoryUseCase,
	deleteCategoryUseCase,
}: HttpAppDependencies) {
	const app = new Hono<HttpEnvironment>()

	app.use("/api/*", async (context, next) => {
		const requestId = context.req.header("cf-ray") ?? crypto.randomUUID()
		const startedAt = performance.now()
		context.set("requestId", requestId)
		await next()
		context.header("X-Request-Id", requestId)
		context.header("X-Content-Type-Options", "nosniff")
		context.header("Referrer-Policy", "strict-origin-when-cross-origin")
		context.header("X-Frame-Options", "DENY")
		context.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		context.header(
			"Content-Security-Policy",
			"frame-ancestors 'none'; object-src 'none'; base-uri 'self'",
		)
		context.header("Cache-Control", "no-store")
		console.info(
			JSON.stringify({
				event: "api_request",
				requestId,
				method: context.req.method,
				route: routePath(context, -1),
				status: context.res.status,
				durationMs: Math.round(performance.now() - startedAt),
			}),
		)
	})
	app.use("/api/*", ...authenticationMiddleware)
	const routes = app
		.route("/", new BootstrapApiRouteHandler(bootstrapUseCase).registerRoutes())
		.route(
			"/",
			new CreateExpenseApiRouteHandler(
				resolveAuthorizationUseCase,
				createExpenseUseCase,
			).registerRoutes(),
		)
		.route(
			"/",
			new ChangeExpenseApiRouteHandler(
				resolveAuthorizationUseCase,
				updateExpenseUseCase,
				deleteExpenseUseCase,
			).registerRoutes(),
		)
		.route(
			"/",
			new GetMonthlyOverviewApiRouteHandler(
				resolveAuthorizationUseCase,
				getMonthlyOverviewUseCase,
			).registerRoutes(),
		)
		.route(
			"/",
			new CategoryApiRouteHandler(
				resolveAuthorizationUseCase,
				listCategoriesUseCase,
				createCategoryUseCase,
				updateCategoryUseCase,
				deleteCategoryUseCase,
			).registerRoutes(),
		)
	app.notFound(notFoundResponse)
	app.onError((error, context) => {
		const domainResponse = domainErrorResponse(error, context)
		if (domainResponse) {
			return domainResponse
		}

		return unexpectedErrorResponse(error, context)
	})

	return routes
}

export type AppType = ReturnType<typeof createHttpApp>
