import type { MonthlyOverviewResponse } from "../../../shared/api/monthly-overview"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import type { MonthlyOverviewRepository } from "../../domain/monthly/repositories/monthly-overview-repository"
import { MonthStart } from "../../domain/monthly/value-objects/month-start"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"

export type MonthlyOverview = MonthlyOverviewResponse

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
				seedKey: category.seedKey,
				iconName: category.iconName,
				expenses: category.expenseAmount,
			})),
			expenses: record.expenses,
		}
	}
}
