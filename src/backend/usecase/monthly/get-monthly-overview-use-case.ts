import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import type { MonthlyOverviewRepository } from "../../domain/monthly/repositories/monthly-overview-repository"
import { MonthStart } from "../../domain/monthly/value-objects/month-start"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"

export type MonthlyOverview = Readonly<{
	month: string
	totals: Readonly<{ expenses: number }>
	uncategorized: Readonly<{
		expenses: number
	}>
	categories: readonly Readonly<{
		id: string
		name: string
		iconName: string
		expenses: number
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
			totals: { expenses: record.totalExpenseAmount },
			uncategorized: { expenses: record.uncategorizedExpenseAmount },
			categories: record.categories.map((category) => ({
				id: category.id,
				name: category.name,
				iconName: category.iconName,
				expenses: category.expenseAmount,
			})),
			expenses: record.expenses,
		}
	}
}
