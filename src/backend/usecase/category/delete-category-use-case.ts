import { CategoryNotFoundError } from "../../domain/category/exceptions/category-not-found-error"
import type { CategoryRepository } from "../../domain/category/repositories/category-repository"
import { CategoryId } from "../../domain/category/value-objects/category-id"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"

export interface DeleteCategoryUseCase {
	execute(
		input: Readonly<{ authorization: AuthorizationContext; categoryId: unknown }>,
	): Promise<void>
}

export class DefaultDeleteCategoryUseCase implements DeleteCategoryUseCase {
	constructor(private readonly repository: CategoryRepository) {}

	async execute(
		input: Readonly<{ authorization: AuthorizationContext; categoryId: unknown }>,
	): Promise<void> {
		const deleted = await this.repository.delete(
			input.authorization.householdId,
			CategoryId.from(input.categoryId),
		)
		if (!deleted) throw new CategoryNotFoundError()
	}
}
