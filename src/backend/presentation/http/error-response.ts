import type { Context } from "hono"
import type { ApplicationError } from "../../application/errors/application-error"

type ErrorBody = Readonly<{
	error: Readonly<{
		code: string
		fields: Readonly<Record<string, string>>
	}>
}>

function errorBody(code: string, fields: Readonly<Record<string, string>> = {}): ErrorBody {
	return { error: { code, fields } }
}

export function applicationErrorResponse(error: ApplicationError, context: Context): Response {
	switch (error.code) {
		case "VALIDATION_ERROR":
			return context.json(errorBody(error.code, error.fields), 400)
		case "NOT_FOUND":
			return context.json(errorBody(error.code, error.fields), 404)
		case "UNAUTHORIZED":
			return context.json(errorBody(error.code, error.fields), 401)
		case "CONFLICT":
			return context.json(errorBody(error.code, error.fields), 409)
	}
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
