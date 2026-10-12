import type { HouseholdId } from "../../household/value-objects/household-id"
import type { MonthStart } from "../value-objects/month-start"

export type MonthlyCategoryRecord = Readonly<{
	id: string
	name: string
	seedKey: string | null
	iconName: string
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
	totalExpenseAmount: number
	uncategorizedExpenseAmount: number
	categories: readonly MonthlyCategoryRecord[]
	expenses: readonly MonthlyExpenseRecord[]
}>

export interface MonthlyOverviewRepository {
	findByMonth(householdId: HouseholdId, month: MonthStart): Promise<MonthlyOverviewRecord>
}
