import { zValidator } from "@hono/zod-validator"
import { Hono, type MiddlewareHandler } from "hono"
import { subscriptionWriteSchema } from "../../../../shared/api/subscription"
import { InvalidValueError } from "../../../domain/shared/exceptions/invalid-value-error"
import type { ResolveAuthorizationUseCase } from "../../../usecase/authorization/resolve-authorization-use-case"
import type {
	CreateSubscriptionUseCase,
	EndSubscriptionUseCase,
	ListSubscriptionsUseCase,
	UpdateSubscriptionUseCase,
} from "../../../usecase/subscription/subscription-use-cases"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../authentication"

const validateJson = zValidator("json", subscriptionWriteSchema, (result) => {
	if (!result.success)
		throw new InvalidValueError("INVALID_FORMAT", String(result.error.issues[0]?.path[0] ?? ""))
})

const requireJson: MiddlewareHandler<HttpEnvironment> = async (context, next) => {
	try {
		await context.req.json()
	} catch {
		throw new InvalidValueError("INVALID_FORMAT")
	}
	await next()
}

export class SubscriptionApiRouteHandler {
	constructor(
		private readonly authorization: ResolveAuthorizationUseCase,
		private readonly list: ListSubscriptionsUseCase,
		private readonly create: CreateSubscriptionUseCase,
		private readonly update: UpdateSubscriptionUseCase,
		private readonly end: EndSubscriptionUseCase,
	) {}

	registerRoutes() {
		return new Hono<HttpEnvironment>()
			.get("/api/subscriptions", async (context) => {
				const authorization = await this.authorization.execute(getAuthenticatedClerkUserId(context))
				return context.json(await this.list.execute(authorization))
			})
			.post("/api/subscriptions", requireJson, validateJson, async (context) => {
				const authorization = await this.authorization.execute(getAuthenticatedClerkUserId(context))
				return context.json(
					await this.create.execute({ authorization, details: context.req.valid("json") }),
					201,
				)
			})
			.patch("/api/subscriptions/:subscriptionId", requireJson, validateJson, async (context) => {
				const authorization = await this.authorization.execute(getAuthenticatedClerkUserId(context))
				return context.json(
					await this.update.execute({
						authorization,
						id: context.req.param("subscriptionId"),
						details: context.req.valid("json"),
					}),
				)
			})
			.delete("/api/subscriptions/:subscriptionId", async (context) => {
				const authorization = await this.authorization.execute(getAuthenticatedClerkUserId(context))
				await this.end.execute({ authorization, id: context.req.param("subscriptionId") })
				return context.body(null, 204)
			})
	}
}
