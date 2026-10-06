import type { Hono } from "hono"
import { InvalidValueError } from "../../../../domain/shared/exceptions/invalid-value-error"
import type { ResolveAuthorizationUseCase } from "../../../../usecase/authorization/resolve-authorization-use-case"
import type { CreateExpenseUseCase } from "../../../../usecase/expense/create-expense-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"

type CreateExpenseBody = Readonly<{
	date?: unknown
	amount?: unknown
	categoryId?: unknown
	memo?: unknown
}>

function readBody(value: unknown): CreateExpenseBody {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new InvalidValueError("INVALID_FORMAT")
	}

	return value
}

export class CreateExpenseApiRouteHandler {
	constructor(
		private readonly resolveAuthorizationUseCase: ResolveAuthorizationUseCase,
		private readonly createExpenseUseCase: CreateExpenseUseCase,
	) {}

	registerRoutes(app: Hono<HttpEnvironment>): void {
		app.post("/api/expenses", async (context) => {
			const parsedBody: unknown = await context.req.json().catch(() => {
				throw new InvalidValueError("INVALID_FORMAT")
			})
			const body = readBody(parsedBody)
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
		})
	}
}
