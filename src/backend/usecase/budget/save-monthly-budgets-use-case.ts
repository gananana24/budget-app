import { BudgetNotFoundError } from "../../domain/budget/exceptions/budget-not-found-error"
import type {
	BudgetDraft,
	MonthlyBudgetRepository,
} from "../../domain/budget/repositories/monthly-budget-repository"
import { CategoryId } from "../../domain/category/value-objects/category-id"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"
import { validateBudgetAmount } from "../../domain/validation/money"
import { requestedBudgetMonth } from "./budget-input"

export type SaveMonthlyBudgetsInput = Readonly<{
	authorization: AuthorizationContext
	month: unknown
	budgets: unknown
}>

export interface SaveMonthlyBudgetsUseCase {
	execute(input: SaveMonthlyBudgetsInput): Promise<BudgetDraft>
}

function validatedBudgets(
	value: unknown,
): readonly Readonly<{ categoryId: string; amount: number }>[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new InvalidValueError("INVALID_FORMAT", "budgets")
	}
	const budgets = value.map((entry: unknown) => {
		if (typeof entry !== "object" || entry === null || Array.isArray(entry)) {
			throw new InvalidValueError("INVALID_FORMAT", "budgets")
		}
		const record = entry as Record<string, unknown>
		const categoryId = CategoryId.from(record.categoryId).value.toLowerCase()
		const result = validateBudgetAmount(record.amount)
		if (!result.success) {
			throw new InvalidValueError(result.code, "amount")
		}
		return { categoryId, amount: result.value }
	})
	if (new Set(budgets.map(({ categoryId }) => categoryId)).size !== budgets.length) {
		throw new InvalidValueError("INVALID_FORMAT", "budgets")
	}
	return budgets
}

export class DefaultSaveMonthlyBudgetsUseCase implements SaveMonthlyBudgetsUseCase {
	constructor(
		private readonly repository: MonthlyBudgetRepository,
		private readonly now: () => Date,
	) {}

	async execute(input: SaveMonthlyBudgetsInput): Promise<BudgetDraft> {
		const month = requestedBudgetMonth(input.month, this.now())
		const budgets = validatedBudgets(input.budgets)
		const householdId = input.authorization.householdId
		await this.repository.lockHousehold(householdId)
		const categoryIds = budgets.map(({ categoryId }) => CategoryId.from(categoryId))
		const available = await this.repository.findAvailableCategoryIds(householdId, categoryIds)
		if (available.size !== budgets.length) {
			throw new BudgetNotFoundError()
		}
		await this.repository.initialize(householdId, month)
		await this.repository.save(householdId, month, budgets)
		return this.repository.findDraft(householdId, month)
	}
}
