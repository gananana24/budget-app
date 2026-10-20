import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { SubscriptionNotFoundError } from "../../domain/subscription/subscription-not-found-error"
import {
	Subscription,
	subscriptionFields,
	type SubscriptionInput,
} from "../../domain/subscription/subscription"
import type { SubscriptionRepository } from "../../domain/subscription/subscription-repository"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"
import { getDateInTokyo } from "../../domain/shared/services/tokyo-calendar"
import type { PostDueSubscriptionUseCase } from "./post-due-subscriptions-use-case"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function idFrom(value: unknown): string {
	if (typeof value !== "string" || !UUID_PATTERN.test(value))
		throw new InvalidValueError("INVALID_FORMAT", "subscriptionId")
	return value
}

function nextFields(input: SubscriptionInput, now: Date) {
	return subscriptionFields(input, getDateInTokyo(now))
}

function futureFields(input: SubscriptionInput, now: Date) {
	const tomorrow = new Date(`${getDateInTokyo(now)}T00:00:00Z`)
	tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
	return subscriptionFields(input, tomorrow.toISOString().slice(0, 10))
}

export type SubscriptionResult = Readonly<{
	id: string
	name: string
	amount: number
	categoryId: string | null
	intervalUnit: "month" | "year"
	billingMonth: number | null
	billingDay: number
	nextPaymentDate: string
	holidayAdjustment: "none" | "previous" | "next"
	monthlyAmount: number
}>

function result(subscription: Subscription, today: string): SubscriptionResult {
	const upcoming = subscription.upcomingAt(today)
	return {
		id: subscription.id,
		name: subscription.fields.name,
		amount: subscription.fields.amount,
		categoryId: subscription.fields.categoryId,
		intervalUnit: subscription.fields.intervalUnit,
		billingMonth: subscription.fields.billingMonth,
		billingDay: subscription.fields.billingDay,
		nextPaymentDate: upcoming.payment,
		holidayAdjustment: subscription.fields.holidayAdjustment,
		monthlyAmount: subscription.monthlyAmount,
	}
}

export interface ListSubscriptionsUseCase {
	execute(
		authorization: AuthorizationContext,
	): Promise<Readonly<{ subscriptions: readonly SubscriptionResult[]; monthlyTotal: number }>>
}

export class DefaultListSubscriptionsUseCase implements ListSubscriptionsUseCase {
	constructor(
		private readonly repository: SubscriptionRepository,
		private readonly now: () => Date,
	) {}

	async execute(authorization: AuthorizationContext) {
		const today = getDateInTokyo(this.now())
		const subscriptions = (await this.repository.findActive(authorization.householdId)).map(
			(subscription) => result(subscription, today),
		)
		return {
			subscriptions,
			monthlyTotal: subscriptions.reduce(
				(total, subscription) => total + subscription.monthlyAmount,
				0,
			),
		}
	}
}

export interface CreateSubscriptionUseCase {
	execute(
		input: Readonly<{ authorization: AuthorizationContext; details: SubscriptionInput }>,
	): Promise<SubscriptionResult>
}

export class DefaultCreateSubscriptionUseCase implements CreateSubscriptionUseCase {
	constructor(
		private readonly repository: SubscriptionRepository,
		private readonly now: () => Date,
		private readonly newId: () => string,
	) {}

	async execute(
		input: Readonly<{ authorization: AuthorizationContext; details: SubscriptionInput }>,
	) {
		const fields = nextFields(input.details, this.now())
		const subscription = new Subscription(
			this.newId(),
			input.authorization.householdId,
			fields,
			0,
			1,
			null,
		)
		return result(await this.repository.create(subscription), getDateInTokyo(this.now()))
	}
}

export interface UpdateSubscriptionUseCase {
	execute(
		input: Readonly<{
			authorization: AuthorizationContext
			id: unknown
			details: SubscriptionInput
		}>,
	): Promise<SubscriptionResult>
}

export class DefaultUpdateSubscriptionUseCase implements UpdateSubscriptionUseCase {
	constructor(
		private readonly repository: SubscriptionRepository,
		private readonly now: () => Date,
		private readonly postDue: PostDueSubscriptionUseCase,
	) {}

	async execute(
		input: Readonly<{
			authorization: AuthorizationContext
			id: unknown
			details: SubscriptionInput
		}>,
	) {
		const id = idFrom(input.id)
		const existing = await this.repository.findActiveById(input.authorization.householdId, id)
		if (!existing) throw new SubscriptionNotFoundError()
		const now = this.now()
		await this.postDue.execute(id, getDateInTokyo(now))
		const current = await this.repository.findActiveById(input.authorization.householdId, id)
		if (!current) throw new SubscriptionNotFoundError()
		const updated = await this.repository.update(current.change(futureFields(input.details, now)))
		if (!updated) throw new SubscriptionNotFoundError()
		return result(updated, getDateInTokyo(this.now()))
	}
}

export interface EndSubscriptionUseCase {
	execute(input: Readonly<{ authorization: AuthorizationContext; id: unknown }>): Promise<void>
}

export class DefaultEndSubscriptionUseCase implements EndSubscriptionUseCase {
	constructor(
		private readonly repository: SubscriptionRepository,
		private readonly postDue: PostDueSubscriptionUseCase,
		private readonly now: () => Date,
	) {}

	async execute(
		input: Readonly<{ authorization: AuthorizationContext; id: unknown }>,
	): Promise<void> {
		const id = idFrom(input.id)
		const existing = await this.repository.findActiveById(input.authorization.householdId, id)
		if (!existing) throw new SubscriptionNotFoundError()
		await this.postDue.execute(id, getDateInTokyo(this.now()))
		if (!(await this.repository.end(existing))) throw new SubscriptionNotFoundError()
	}
}
