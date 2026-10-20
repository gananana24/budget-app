import {
	nominalDateForBillingDay,
	paymentDate,
	parseDate,
} from "../../domain/subscription/subscription-schedule"
import type { SubscriptionPostingRepository } from "../../domain/subscription/subscription-posting-repository"

export interface PostDueSubscriptionsUseCase {
	execute(today: string): Promise<number>
}

export interface PostDueSubscriptionUseCase {
	execute(id: string, today: string): Promise<number>
}

export class DefaultPostDueSubscriptionsUseCase implements PostDueSubscriptionsUseCase {
	constructor(
		private readonly findActiveIds: () => Promise<readonly string[]>,
		private readonly postOne: (id: string, today: string) => Promise<number>,
	) {}

	async execute(today: string): Promise<number> {
		parseDate(today, "today")
		const ids = await this.findActiveIds()
		let total = 0
		for (const id of ids) total += await this.postOne(id, today)
		return total
	}
}

export class DefaultPostDueSubscriptionUseCase implements PostDueSubscriptionUseCase {
	constructor(
		private readonly repository: SubscriptionPostingRepository,
		private readonly newExpenseId: () => string,
	) {}

	async execute(id: string, today: string): Promise<number> {
		const subscription = await this.repository.findLocked(id)
		if (!subscription) return 0
		const { anchorDate, intervalUnit, billingDay, holidayAdjustment } = subscription.fields
		let count = 0
		for (
			let index = subscription.occurrenceIndex;
			index < subscription.occurrenceIndex + 10_000;
			index += 1
		) {
			const nominal = nominalDateForBillingDay(anchorDate, intervalUnit, billingDay, index)
			const payment = paymentDate(nominal, holidayAdjustment)
			if (payment > today) return count
			const nextNominal = nominalDateForBillingDay(anchorDate, intervalUnit, billingDay, index + 1)
			await this.repository.post(
				subscription,
				{ index, nominal, payment, nextNominal },
				this.newExpenseId(),
			)
			count += 1
		}
		throw new Error("Subscription has too many unpaid occurrences")
	}
}
