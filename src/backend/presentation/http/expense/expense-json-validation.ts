import { zValidator } from "@hono/zod-validator"
import type { MiddlewareHandler } from "hono"
import { createExpenseRequestSchema } from "../../../../shared/api/create-expense"
import { InvalidValueError } from "../../../domain/shared/exceptions/invalid-value-error"
import type { HttpEnvironment } from "../authentication"

export const requireExpenseJson: MiddlewareHandler<HttpEnvironment> = async (context, next) => {
	try {
		await context.req.json()
	} catch {
		throw new InvalidValueError("INVALID_FORMAT")
	}
	await next()
}

export const validateExpenseJson = zValidator("json", createExpenseRequestSchema, (result) => {
	if (!result.success) {
		const field = result.error.issues[0]?.path[0]
		if (field === "amount") {
			throw new InvalidValueError("OUT_OF_RANGE", field)
		}
		if (field === "date" || field === "categoryId" || field === "memo") {
			throw new InvalidValueError("INVALID_FORMAT", field)
		}
		throw new InvalidValueError("INVALID_FORMAT")
	}
})
