import type { Subscription } from "./subscription"

export interface SubscriptionPostingRepository {
	findActiveIds(): Promise<readonly string[]>
	findLocked(id: string): Promise<Subscription | null>
	post(
		subscription: Subscription,
		occurrence: Readonly<{ index: number; nominal: string; payment: string; nextNominal: string }>,
		expenseId: string,
	): Promise<void>
}
