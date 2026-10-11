import type { CategoryId } from "../../category/value-objects/category-id"
import type { HouseholdId } from "../../household/value-objects/household-id"
import type { MonthStart } from "../value-objects/month-start"

export type BudgetAmount = Readonly<{ categoryId: string; amount: number }>
export type BudgetDraft = Readonly<{
	month: string
	initialized: boolean
	budgets: readonly BudgetAmount[]
}>

export interface MonthlyBudgetRepository {
	findDraft(householdId: HouseholdId, month: MonthStart): Promise<BudgetDraft>
	lockHousehold(householdId: HouseholdId): Promise<void>
	initialize(householdId: HouseholdId, month: MonthStart): Promise<void>
	findAvailableCategoryIds(
		householdId: HouseholdId,
		categoryIds: readonly CategoryId[],
	): Promise<ReadonlySet<string>>
	save(householdId: HouseholdId, month: MonthStart, budgets: readonly BudgetAmount[]): Promise<void>
	delete(householdId: HouseholdId, month: MonthStart, categoryId: CategoryId): Promise<boolean>
}
