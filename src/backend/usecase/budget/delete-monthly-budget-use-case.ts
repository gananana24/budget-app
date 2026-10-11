import { BudgetNotFoundError } from "../../domain/budget/exceptions/budget-not-found-error"
import type { MonthlyBudgetRepository } from "../../domain/budget/repositories/monthly-budget-repository"
import { CategoryId } from "../../domain/category/value-objects/category-id"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { requestedBudgetMonth } from "./budget-input"

export interface DeleteMonthlyBudgetUseCase {
	execute(
		input: Readonly<{ authorization: AuthorizationContext; month: unknown; categoryId: unknown }>,
	): Promise<void>
}

export class DefaultDeleteMonthlyBudgetUseCase implements DeleteMonthlyBudgetUseCase {
	constructor(
		private readonly repository: MonthlyBudgetRepository,
		private readonly now: () => Date,
	) {}

	async execute(
		input: Readonly<{ authorization: AuthorizationContext; month: unknown; categoryId: unknown }>,
	): Promise<void> {
		const month = requestedBudgetMonth(input.month, this.now())
		const categoryId = CategoryId.from(input.categoryId)
		await this.repository.lockHousehold(input.authorization.householdId)
		if (!(await this.repository.delete(input.authorization.householdId, month, categoryId))) {
			throw new BudgetNotFoundError()
		}
	}
}
