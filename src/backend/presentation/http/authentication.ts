import type { Context, MiddlewareHandler } from "hono"
import { UnauthorizedError } from "../../domain/authentication/exceptions/unauthorized-error"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"
import { ClerkUserId } from "../../domain/user/value-objects/clerk-user-id"

export type HttpEnvironment = {
	Bindings: Env
	Variables: {
		clerkUserId: ClerkUserId
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
			throw new UnauthorizedError()
		}

		try {
			context.set("clerkUserId", ClerkUserId.from(clerkUserId))
		} catch (error) {
			if (error instanceof InvalidValueError) {
				throw new UnauthorizedError()
			}
			throw error
		}
		await next()
	}
}

export function getAuthenticatedClerkUserId(context: Context<HttpEnvironment>): ClerkUserId {
	return context.get("clerkUserId")
}
