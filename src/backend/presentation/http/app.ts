import { Hono } from "hono"
import { ApplicationError } from "../../application/errors/application-error"
import {
	applicationErrorResponse,
	notFoundResponse,
	unexpectedErrorResponse,
} from "./error-response"

export function createHttpApp(): Hono<{ Bindings: Env }> {
	const app = new Hono<{ Bindings: Env }>()

	app.notFound(notFoundResponse)
	app.onError((error, context) => {
		if (error instanceof ApplicationError) {
			return applicationErrorResponse(error, context)
		}

		return unexpectedErrorResponse(error, context)
	})

	return app
}
