import type { MonthStart } from "../../budget/value-objects/month-start"
import type { HouseholdId } from "../../household/value-objects/household-id"

export type MonthlyCategoryRecord = Readonly<{
	id: string
	name: string
	budgetAmount: number | null
	expenseAmount: number
}>

export type MonthlyExpenseRecord = Readonly<{
	id: string
	date: string
	amount: number
	categoryId: string | null
	memo: string | null
	createdAt: string
	updatedAt: string
}>

export type MonthlyOverviewRecord = Readonly<{
	initialized: boolean
	totalBudgetAmount: number
	totalExpenseAmount: number
	uncategorizedExpenseAmount: number
	categories: readonly MonthlyCategoryRecord[]
	expenses: readonly MonthlyExpenseRecord[]
}>

export interface MonthlyOverviewRepository {
	findByMonth(householdId: HouseholdId, month: MonthStart): Promise<MonthlyOverviewRecord>
}
