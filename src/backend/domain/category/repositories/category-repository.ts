import type { HouseholdId } from "../../household/value-objects/household-id"
import type { CategoryIconName } from "../value-objects/category-icon-name"
import type { CategoryId } from "../value-objects/category-id"
import type { CategoryName } from "../value-objects/category-name"

export type Category = Readonly<{ id: string; name: string; iconName: string; isInitial: boolean }>

export interface CategoryRepository {
	findAll(householdId: HouseholdId): Promise<readonly Category[]>
	create(
		householdId: HouseholdId,
		name: CategoryName,
		iconName: CategoryIconName,
	): Promise<Category>
	update(
		householdId: HouseholdId,
		id: CategoryId,
		name: CategoryName,
		iconName: CategoryIconName,
	): Promise<Category | null>
	delete(householdId: HouseholdId, id: CategoryId): Promise<boolean>
}
