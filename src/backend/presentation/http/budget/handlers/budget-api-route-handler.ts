import type { Hono } from "hono"
import { InvalidValueError } from "../../../../domain/shared/exceptions/invalid-value-error"
import type { ResolveAuthorizationUseCase } from "../../../../usecase/authorization/resolve-authorization-use-case"
import type { DeleteMonthlyBudgetUseCase } from "../../../../usecase/budget/delete-monthly-budget-use-case"
import type { GetBudgetDraftUseCase } from "../../../../usecase/budget/get-budget-draft-use-case"
import type { SaveMonthlyBudgetsUseCase } from "../../../../usecase/budget/save-monthly-budgets-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"

export class BudgetApiRouteHandler {
	constructor(
		private readonly resolveAuthorizationUseCase: ResolveAuthorizationUseCase,
		private readonly getBudgetDraftUseCase: GetBudgetDraftUseCase,
		private readonly saveMonthlyBudgetsUseCase: SaveMonthlyBudgetsUseCase,
		private readonly deleteMonthlyBudgetUseCase: DeleteMonthlyBudgetUseCase,
	) {}

	registerRoutes(app: Hono<HttpEnvironment>): void {
		app.get("/api/months/:month/budget-draft", async (context) => {
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			return context.json(
				await this.getBudgetDraftUseCase.execute({
					authorization,
					month: context.req.param("month"),
				}),
			)
		})

		app.put("/api/months/:month/budgets", async (context) => {
			const parsed: unknown = await context.req.json().catch(() => {
				throw new InvalidValueError("INVALID_FORMAT")
			})
			if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
				throw new InvalidValueError("INVALID_FORMAT")
			}
			const body = parsed as Record<string, unknown>
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			return context.json(
				await this.saveMonthlyBudgetsUseCase.execute({
					authorization,
					month: context.req.param("month"),
					budgets: body.budgets,
				}),
			)
		})

		app.delete("/api/months/:month/budgets/:categoryId", async (context) => {
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			await this.deleteMonthlyBudgetUseCase.execute({
				authorization,
				month: context.req.param("month"),
				categoryId: context.req.param("categoryId"),
			})
			return context.body(null, 204)
		})
	}
}
