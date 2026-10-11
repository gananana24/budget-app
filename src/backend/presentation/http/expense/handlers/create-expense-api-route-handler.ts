import { Hono } from "hono"
import type { ResolveAuthorizationUseCase } from "../../../../usecase/authorization/resolve-authorization-use-case"
import type { CreateExpenseUseCase } from "../../../../usecase/expense/create-expense-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"
import { requireExpenseJson, validateExpenseJson } from "../expense-json-validation"

export class CreateExpenseApiRouteHandler {
	constructor(
		private readonly resolveAuthorizationUseCase: ResolveAuthorizationUseCase,
		private readonly createExpenseUseCase: CreateExpenseUseCase,
	) {}

	registerRoutes() {
		return new Hono<HttpEnvironment>().post(
			"/api/expenses",
			requireExpenseJson,
			validateExpenseJson,
			async (context) => {
				const body = context.req.valid("json")
				const authorization = await this.resolveAuthorizationUseCase.execute(
					getAuthenticatedClerkUserId(context),
				)
				const result = await this.createExpenseUseCase.execute({
					authorization,
					date: body.date,
					amount: body.amount,
					categoryId: body.categoryId,
					memo: body.memo,
				})
				return context.json(result, 201)
			},
		)
	}
}
