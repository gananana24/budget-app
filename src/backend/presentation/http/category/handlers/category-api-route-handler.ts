import { Hono } from "hono"
import type { ResolveAuthorizationUseCase } from "../../../../usecase/authorization/resolve-authorization-use-case"
import type { CreateCategoryUseCase } from "../../../../usecase/category/create-category-use-case"
import type { DeleteCategoryUseCase } from "../../../../usecase/category/delete-category-use-case"
import type { ListCategoriesUseCase } from "../../../../usecase/category/list-categories-use-case"
import type { UpdateCategoryUseCase } from "../../../../usecase/category/update-category-use-case"
import { getAuthenticatedClerkUserId, type HttpEnvironment } from "../../authentication"
import { requireCategoryJson, validateCategoryJson } from "../category-json-validation"

export class CategoryApiRouteHandler {
	constructor(
		private readonly resolveAuthorizationUseCase: ResolveAuthorizationUseCase,
		private readonly listCategoriesUseCase: ListCategoriesUseCase,
		private readonly createCategoryUseCase: CreateCategoryUseCase,
		private readonly updateCategoryUseCase: UpdateCategoryUseCase,
		private readonly deleteCategoryUseCase: DeleteCategoryUseCase,
	) {}

	registerRoutes() {
		return new Hono<HttpEnvironment>()
			.get("/api/categories", async (context) => {
				const authorization = await this.resolveAuthorizationUseCase.execute(
					getAuthenticatedClerkUserId(context),
				)
				return context.json({ categories: await this.listCategoriesUseCase.execute(authorization) })
			})
			.post("/api/categories", requireCategoryJson, validateCategoryJson, async (context) => {
				const body = context.req.valid("json")
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
			.patch(
				"/api/categories/:categoryId",
				requireCategoryJson,
				validateCategoryJson,
				async (context) => {
					const body = context.req.valid("json")
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
				},
			)
			.delete("/api/categories/:categoryId", async (context) => {
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
