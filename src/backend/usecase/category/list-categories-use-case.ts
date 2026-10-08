import type {
	Category,
	CategoryRepository,
} from "../../domain/category/repositories/category-repository"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"

export interface ListCategoriesUseCase {
	execute(authorization: AuthorizationContext): Promise<readonly Category[]>
}

export class DefaultListCategoriesUseCase implements ListCategoriesUseCase {
	constructor(private readonly repository: CategoryRepository) {}

	execute(authorization: AuthorizationContext): Promise<readonly Category[]> {
		return this.repository.findAll(authorization.householdId)
	}
}
