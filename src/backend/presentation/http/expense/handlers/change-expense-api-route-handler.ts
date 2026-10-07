import type { Hono } from "hono"
import { InvalidValueError } from "../../../../domain/shared/exceptions/invalid-value-error"
import type { ResolveAuthorizationUseCase } from "../../../../usecase/authorization/resolve-authorization-use-case"
import type { DeleteExpenseUseCase } from "../../../../usecase/expense/delete-expense-use-case"
import type { UpdateExpenseUseCase } from "../../../../usecase/expense/update-expense-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"

function readBody(value: unknown): Record<string, unknown> {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new InvalidValueError("INVALID_FORMAT")
	}
	return value as Record<string, unknown>
}

export class ChangeExpenseApiRouteHandler {
	constructor(
		private readonly resolveAuthorizationUseCase: ResolveAuthorizationUseCase,
		private readonly updateExpenseUseCase: UpdateExpenseUseCase,
		private readonly deleteExpenseUseCase: DeleteExpenseUseCase,
	) {}

	registerRoutes(app: Hono<HttpEnvironment>): void {
		app.patch("/api/expenses/:expenseId", async (context) => {
			const parsedBody: unknown = await context.req.json().catch(() => {
				throw new InvalidValueError("INVALID_FORMAT")
			})
			const body = readBody(parsedBody)
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			const result = await this.updateExpenseUseCase.execute({
				authorization,
				expenseId: context.req.param("expenseId"),
				date: body.date,
				amount: body.amount,
				categoryId: body.categoryId,
				memo: body.memo,
			})
			return context.json(result)
		})

		app.delete("/api/expenses/:expenseId", async (context) => {
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			await this.deleteExpenseUseCase.execute({
				authorization,
				expenseId: context.req.param("expenseId"),
			})
			return context.body(null, 204)
		})
	}
}
