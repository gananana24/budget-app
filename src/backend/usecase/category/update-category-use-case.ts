import { CategoryNotFoundError } from "../../domain/category/exceptions/category-not-found-error"
import type {
	Category,
	CategoryRepository,
} from "../../domain/category/repositories/category-repository"
import { CategoryIconName } from "../../domain/category/value-objects/category-icon-name"
import { CategoryId } from "../../domain/category/value-objects/category-id"
import { CategoryName } from "../../domain/category/value-objects/category-name"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"

export interface UpdateCategoryUseCase {
	execute(
		input: Readonly<{
			authorization: AuthorizationContext
			categoryId: unknown
			name: unknown
			iconName: unknown
		}>,
	): Promise<Category>
}

export class DefaultUpdateCategoryUseCase implements UpdateCategoryUseCase {
	constructor(private readonly repository: CategoryRepository) {}

	async execute(
		input: Readonly<{
			authorization: AuthorizationContext
			categoryId: unknown
			name: unknown
			iconName: unknown
		}>,
	): Promise<Category> {
		const category = await this.repository.update(
			input.authorization.householdId,
			CategoryId.from(input.categoryId),
			CategoryName.from(input.name),
			CategoryIconName.from(input.iconName),
		)
		if (!category) throw new CategoryNotFoundError()
		return category
	}
}
