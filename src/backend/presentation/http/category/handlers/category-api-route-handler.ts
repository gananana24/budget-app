import type { Hono } from "hono"
import { InvalidValueError } from "../../../../domain/shared/exceptions/invalid-value-error"
import type { ResolveAuthorizationUseCase } from "../../../../usecase/authorization/resolve-authorization-use-case"
import type { CreateCategoryUseCase } from "../../../../usecase/category/create-category-use-case"
import type { DeleteCategoryUseCase } from "../../../../usecase/category/delete-category-use-case"
import type { ListCategoriesUseCase } from "../../../../usecase/category/list-categories-use-case"
import type { UpdateCategoryUseCase } from "../../../../usecase/category/update-category-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"

async function readBody(context: {
	req: { json(): Promise<unknown> }
}): Promise<Record<string, unknown>> {
	const value = await context.req.json().catch(() => {
		throw new InvalidValueError("INVALID_FORMAT")
	})
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		throw new InvalidValueError("INVALID_FORMAT")
	}
	return value as Record<string, unknown>
}

export class CategoryApiRouteHandler {
	constructor(
		private readonly resolveAuthorizationUseCase: ResolveAuthorizationUseCase,
		private readonly listCategoriesUseCase: ListCategoriesUseCase,
		private readonly createCategoryUseCase: CreateCategoryUseCase,
		private readonly updateCategoryUseCase: UpdateCategoryUseCase,
		private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
	) {}

	registerRoutes(app: Hono<HttpEnvironment>): void {
		app.get("/api/categories", async (context) => {
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			return context.json({ categories: await this.listCategoriesUseCase.execute(authorization) })
		})
		app.post("/api/categories", async (context) => {
			const body = await readBody(context)
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			return context.json(
				await this.createCategoryUseCase.execute({
					authorization,
					name: body.name,
					iconName: body.iconName,
				}),
				201,
			)
		})
		app.patch("/api/categories/:categoryId", async (context) => {
			const body = await readBody(context)
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			return context.json(
				await this.updateCategoryUseCase.execute({
					authorization,
					categoryId: context.req.param("categoryId"),
					name: body.name,
					iconName: body.iconName,
				}),
			)
		})
		app.delete("/api/categories/:categoryId", async (context) => {
			const authorization = await this.resolveAuthorizationUseCase.execute(
				getAuthenticatedClerkUserId(context),
			)
			await this.deleteCategoryUseCase.execute({
				authorization,
				categoryId: context.req.param("categoryId"),
			})
			return context.body(null, 204)
		})
	}
}
