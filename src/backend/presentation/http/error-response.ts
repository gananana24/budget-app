import type { Context } from "hono"
import { UnauthorizedError } from "../../domain/authentication/exceptions/unauthorized-error"
import { BootstrapRequiredError } from "../../domain/authorization/exceptions/bootstrap-required-error"
import { CategoryNameConflictError } from "../../domain/category/exceptions/category-name-conflict-error"
import { CategoryNotFoundError } from "../../domain/category/exceptions/category-not-found-error"
import { ExpenseCategoryNotFoundError } from "../../domain/expense/exceptions/expense-category-not-found-error"
import { ExpenseNotFoundError } from "../../domain/expense/exceptions/expense-not-found-error"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"
import { type ErrorCode, errorMessages } from "./error-messages"

type ErrorBody = Readonly<{
	error: Readonly<{
		code: string
		message: string
		fields: Readonly<Record<string, string>>
	}>
}>

function errorBody(code: ErrorCode, fields: Readonly<Record<string, string>> = {}): ErrorBody {
	return { error: { code, message: errorMessages[code], fields } }
}

export function domainErrorResponse(error: unknown, context: Context): Response | null {
	if (error instanceof UnauthorizedError) {
		return context.json(errorBody("UNAUTHORIZED"), 401)
	}

	if (error instanceof BootstrapRequiredError) {
		return context.json(errorBody("BOOTSTRAP_REQUIRED"), 409)
	}

	if (error instanceof InvalidValueError) {
		return context.json(
			errorBody("VALIDATION_ERROR", {
				reason: error.reason,
				...(error.field ? { field: error.field } : {}),
			}),
			400,
		)
	}

	if (error instanceof CategoryNameConflictError) {
		return context.json(errorBody("CATEGORY_NAME_CONFLICT"), 409)
	}

	if (
		error instanceof CategoryNotFoundError ||
		error instanceof ExpenseCategoryNotFoundError ||
		error instanceof ExpenseNotFoundError
	) {
		return context.json(errorBody("NOT_FOUND"), 404)
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
