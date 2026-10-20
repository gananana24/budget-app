import type { HouseholdId } from "../household/value-objects/household-id"
import type { Subscription } from "./subscription"

export interface SubscriptionRepository {
	findActive(householdId: HouseholdId): Promise<readonly Subscription[]>
	findActiveById(householdId: HouseholdId, id: string): Promise<Subscription | null>
	create(subscription: Subscription): Promise<Subscription>
	update(subscription: Subscription): Promise<Subscription | null>
	end(subscription: Subscription): Promise<boolean>
}
