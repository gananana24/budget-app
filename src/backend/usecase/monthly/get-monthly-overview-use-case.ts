import { MonthStart } from "../../domain/budget/value-objects/month-start"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import type { MonthlyOverviewRepository } from "../../domain/monthly/repositories/monthly-overview-repository"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"

type UnsetBudget = Readonly<{ status: "unset" }>
type SetBudget = Readonly<{ status: "set"; amount: number }>

export type MonthlyOverview = Readonly<{
	month: string
	initialized: boolean
	totals: Readonly<{
		budget: number
		expenses: number
		remaining: number
	}>
	uncategorized: Readonly<{
		expenses: number
	}>
	categories: readonly Readonly<{
		id: string
		name: string
		budget: UnsetBudget | SetBudget
		expenses: number
		remaining: number | null
	}>[]
	expenses: readonly Readonly<{
		id: string
		date: string
		amount: number
		categoryId: string | null
		memo: string | null
		createdAt: string
		updatedAt: string
	}>[]
}>

export type GetMonthlyOverviewInput = Readonly<{
	authorization: AuthorizationContext
	month: unknown
}>

export interface GetMonthlyOverviewUseCase {
	execute(input: GetMonthlyOverviewInput): Promise<MonthlyOverview>
}

type GetMonthlyOverviewUseCaseDependencies = Readonly<{
	monthlyOverviewRepository: MonthlyOverviewRepository
	now: () => Date
}>

function subtractSafeIntegers(left: number, right: number): number {
	const result = left - right
	if (!Number.isSafeInteger(result)) {
		throw new Error("Monthly aggregate exceeds the safe integer range")
	}
	return result
}

export class DefaultGetMonthlyOverviewUseCase implements GetMonthlyOverviewUseCase {
	constructor(private readonly dependencies: GetMonthlyOverviewUseCaseDependencies) {}

	async execute(input: GetMonthlyOverviewInput): Promise<MonthlyOverview> {
		const month = MonthStart.from(input.month)
		const currentMonth = MonthStart.fromInstantInTokyo(this.dependencies.now())
		if (month.value > currentMonth.value) {
			throw new InvalidValueError("OUT_OF_RANGE")
		}

		const record = await this.dependencies.monthlyOverviewRepository.findByMonth(
			input.authorization.householdId,
			month,
		)

		return {
			month: month.value,
			initialized: record.initialized,
			totals: {
				budget: record.totalBudgetAmount,
				expenses: record.totalExpenseAmount,
				remaining: subtractSafeIntegers(record.totalBudgetAmount, record.totalExpenseAmount),
			},
			uncategorized: { expenses: record.uncategorizedExpenseAmount },
			categories: record.categories.map((category) => ({
				id: category.id,
				name: category.name,
				budget:
					category.budgetAmount === null
						? { status: "unset" as const }
						: { status: "set" as const, amount: category.budgetAmount },
				expenses: category.expenseAmount,
				remaining:
					category.budgetAmount === null
						? null
						: subtractSafeIntegers(category.budgetAmount, category.expenseAmount),
			})),
			expenses: record.expenses,
		}
	}
}
