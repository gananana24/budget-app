import type { Context } from "hono"
import { UnauthorizedError } from "../../domain/authentication/exceptions/unauthorized-error"
import { BootstrapRequiredError } from "../../domain/authorization/exceptions/bootstrap-required-error"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"

type ErrorBody = Readonly<{
	error: Readonly<{
		code: string
		fields: Readonly<Record<string, string>>
	}>
}>

function errorBody(code: string, fields: Readonly<Record<string, string>> = {}): ErrorBody {
	return { error: { code, fields } }
}

export function domainErrorResponse(error: unknown, context: Context): Response | null {
	if (error instanceof UnauthorizedError) {
		return context.json(errorBody("UNAUTHORIZED"), 401)
	}

	if (error instanceof BootstrapRequiredError) {
		return context.json(errorBody("BOOTSTRAP_REQUIRED"), 409)
	}

	if (error instanceof InvalidValueError) {
		return context.json(errorBody("VALIDATION_ERROR", { reason: error.reason }), 400)
	}

	return null
}

export function notFoundResponse(context: Context): Response {
	return context.json(errorBody("NOT_FOUND"), 404)
}

export function unexpectedErrorResponse(error: unknown, context: Context): Response {
	const requestId = context.req.header("cf-ray") ?? crypto.randomUUID()
	console.error(
		JSON.stringify({
			event: "unhandled_error",
			requestId,
			method: context.req.method,
			path: new URL(context.req.url).pathname,
			errorType: error instanceof Error ? error.name : "UnknownError",
		}),
	)

	return context.json(errorBody("INTERNAL_ERROR"), 500)
}
