import { Hono } from "hono"
import type { BootstrapUseCase } from "../../../../usecase/bootstrap/bootstrap-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"

export class BootstrapApiRouteHandler {
	constructor(private readonly bootstrapUseCase: BootstrapUseCase) {}

	registerRoutes() {
		return new Hono<HttpEnvironment>().post("/api/bootstrap", async (context) => {
			await this.bootstrapUseCase.execute(getAuthenticatedClerkUserId(context))
			return context.body(null, 204)
		})
	}
}
