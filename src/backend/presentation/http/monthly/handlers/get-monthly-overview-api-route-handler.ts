import type { Hono } from "hono"
import type { ResolveAuthorizationUseCase } from "../../../../usecase/authorization/resolve-authorization-use-case"
import type { GetMonthlyOverviewUseCase } from "../../../../usecase/monthly/get-monthly-overview-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"

export class GetMonthlyOverviewApiRouteHandler {
	constructor(
		private readonly resolveAuthorizationUseCase: ResolveAuthorizationUseCase,
		private readonly getMonthlyOverviewUseCase: GetMonthlyOverviewUseCase,
	) {}

	registerRoutes(app: Hono<HttpEnvironment>): void {
		app.get("/api/months/:month", async (context) => {
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			const result = await this.getMonthlyOverviewUseCase.execute({
				authorization,
				month: context.req.param("month"),
			})
			return context.json(result, 200)
		})
	}
}
