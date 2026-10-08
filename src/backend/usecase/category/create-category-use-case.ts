import type {
	Category,
	CategoryRepository,
} from "../../domain/category/repositories/category-repository"
import { CategoryIconName } from "../../domain/category/value-objects/category-icon-name"
import { CategoryName } from "../../domain/category/value-objects/category-name"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"

export interface CreateCategoryUseCase {
	execute(
		input: Readonly<{ authorization: AuthorizationContext; name: unknown; iconName: unknown }>,
	): Promise<Category>
}

export class DefaultCreateCategoryUseCase implements CreateCategoryUseCase {
	constructor(private readonly repository: CategoryRepository) {}

	execute(
		input: Readonly<{ authorization: AuthorizationContext; name: unknown; iconName: unknown }>,
	): Promise<Category> {
		return this.repository.create(
			input.authorization.householdId,
			CategoryName.from(input.name),
			CategoryIconName.from(input.iconName),
		)
	}
}
