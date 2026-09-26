import type { Context, MiddlewareHandler } from "hono"
import type { AuthenticatedUser } from "../../application/auth/authenticated-user"
import { ApplicationError } from "../../application/errors/application-error"

export type HttpEnvironment = {
	Bindings: Env
	Variables: {
		authenticatedUser: AuthenticatedUser
	}
}

type ResolveClerkUserId = (
	context: Context<HttpEnvironment>,
) => string | null | undefined | Promise<string | null | undefined>

export function createAuthenticatedUserMiddleware(
	resolveClerkUserId: ResolveClerkUserId,
): MiddlewareHandler<HttpEnvironment> {
	return async (context, next) => {
		const clerkUserId = await resolveClerkUserId(context)
		if (!clerkUserId) {
			throw new ApplicationError("UNAUTHORIZED")
		}

		context.set("authenticatedUser", { clerkUserId })
		await next()
	}
}

export function getAuthenticatedUser(context: Context<HttpEnvironment>): AuthenticatedUser {
	return context.get("authenticatedUser")
}
