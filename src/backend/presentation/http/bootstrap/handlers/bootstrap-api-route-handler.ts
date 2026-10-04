import type { Hono } from "hono"
import type { BootstrapUseCase } from "../../../../usecase/bootstrap/bootstrap-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"

export class BootstrapApiRouteHandler {
	constructor(private readonly bootstrapUseCase: BootstrapUseCase) {}

	registerRoutes(app: Hono<HttpEnvironment>): void {
		app.post("/api/bootstrap", async (context) => {
			await this.bootstrapUseCase.execute(getAuthenticatedClerkUserId(context))
			return context.body(null, 204)
		})
	}
}
