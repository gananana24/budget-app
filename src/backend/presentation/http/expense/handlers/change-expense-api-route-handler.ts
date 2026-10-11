import { Hono } from "hono"
import type { ResolveAuthorizationUseCase } from "../../../../usecase/authorization/resolve-authorization-use-case"
import type { DeleteExpenseUseCase } from "../../../../usecase/expense/delete-expense-use-case"
import type { UpdateExpenseUseCase } from "../../../../usecase/expense/update-expense-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"
import { requireExpenseJson, validateExpenseJson } from "../expense-json-validation"

export class ChangeExpenseApiRouteHandler {
	constructor(
		private readonly resolveAuthorizationUseCase: ResolveAuthorizationUseCase,
		private readonly updateExpenseUseCase: UpdateExpenseUseCase,
		private readonly deleteExpenseUseCase: DeleteExpenseUseCase,
	) {}

	registerRoutes() {
		return new Hono<HttpEnvironment>()
			.patch(
				"/api/expenses/:expenseId",
				requireExpenseJson,
				validateExpenseJson,
				async (context) => {
					const body = context.req.valid("json")
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
				},
			)
			.delete("/api/expenses/:expenseId", async (context) => {
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
