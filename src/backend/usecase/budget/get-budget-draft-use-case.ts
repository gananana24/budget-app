import type {
	BudgetDraft,
	MonthlyBudgetRepository,
} from "../../domain/budget/repositories/monthly-budget-repository"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { requestedBudgetMonth } from "./budget-input"

export interface GetBudgetDraftUseCase {
	execute(
		input: Readonly<{ authorization: AuthorizationContext; month: unknown }>,
	): Promise<BudgetDraft>
}

export class DefaultGetBudgetDraftUseCase implements GetBudgetDraftUseCase {
	constructor(
		private readonly repository: MonthlyBudgetRepository,
		private readonly now: () => Date,
	) {}

	execute(
		input: Readonly<{ authorization: AuthorizationContext; month: unknown }>,
	): Promise<BudgetDraft> {
		const month = requestedBudgetMonth(input.month, this.now())
		return this.repository.findDraft(input.authorization.householdId, month)
	}
}
