import { zValidator } from "@hono/zod-validator"
import type { MiddlewareHandler } from "hono"
import { categoryWriteRequestSchema } from "../../../../shared/api/category"
import { InvalidValueError } from "../../../domain/shared/exceptions/invalid-value-error"
import type { HttpEnvironment } from "../authentication"

export const requireCategoryJson: MiddlewareHandler<HttpEnvironment> = async (context, next) => {
	try {
		await context.req.json()
	} catch {
		throw new InvalidValueError("INVALID_FORMAT")
	}
	await next()
}

export const validateCategoryJson = zValidator("json", categoryWriteRequestSchema, (result) => {
	if (!result.success) {
		const field = result.error.issues[0]?.path[0]
		if (field === "name" || field === "iconName") {
			throw new InvalidValueError("INVALID_FORMAT", field)
		}
		throw new InvalidValueError("INVALID_FORMAT")
	}
})
