import { CategoryId } from "../category/value-objects/category-id"
import type { HouseholdId } from "../household/value-objects/household-id"
import { InvalidValueError } from "../shared/exceptions/invalid-value-error"
import { validateExpenseAmount } from "../validation/money"
import { normalizeCategoryName } from "../validation/text"
import {
	monthlyEquivalent,
	firstNominalDate,
	nominalDateForBillingDay,
	paymentDate,
	type HolidayAdjustment,
	type IntervalUnit,
} from "./subscription-schedule"

export type SubscriptionInput = Readonly<{
	name: unknown
	amount: unknown
	categoryId: unknown
	intervalUnit: unknown
	billingMonth: unknown
	billingDay: unknown
	holidayAdjustment: unknown
}>

export type SubscriptionFields = Readonly<{
	name: string
	amount: number
	categoryId: string | null
	intervalUnit: IntervalUnit
	billingMonth: number | null
	billingDay: number
	anchorDate: string
	nextNominalDate: string
	holidayAdjustment: HolidayAdjustment
}>

export function subscriptionFields(input: SubscriptionInput, today: string): SubscriptionFields {
	const name = normalizeCategoryName(input.name)
	if (!name.success) throw new InvalidValueError(name.code, "name")
	const amount = validateExpenseAmount(input.amount)
	if (!amount.success) throw new InvalidValueError(amount.code, "amount")
	const categoryId = input.categoryId === null ? null : CategoryId.from(input.categoryId).value
	if (input.intervalUnit !== "month" && input.intervalUnit !== "year") {
		throw new InvalidValueError("INVALID_FORMAT", "intervalUnit")
	}
	if (
		input.holidayAdjustment !== "none" &&
		input.holidayAdjustment !== "previous" &&
		input.holidayAdjustment !== "next"
	) {
		throw new InvalidValueError("INVALID_FORMAT", "holidayAdjustment")
	}
	const billingMonth = input.billingMonth
	const billingDay = input.billingDay
	if (
		(input.intervalUnit === "month" && billingMonth !== null) ||
		(input.intervalUnit === "year" &&
			(!Number.isInteger(billingMonth) ||
				(billingMonth as number) < 1 ||
				(billingMonth as number) > 12))
	)
		throw new InvalidValueError("INVALID_FORMAT", "billingMonth")
	if (!Number.isInteger(billingDay) || (billingDay as number) < 1 || (billingDay as number) > 31) {
		throw new InvalidValueError("OUT_OF_RANGE", "billingDay")
	}
	if (
		input.intervalUnit === "year" &&
		new Date(Date.UTC(2028, (billingMonth as number) - 1, billingDay as number)).getUTCMonth() !==
			(billingMonth as number) - 1
	) {
		throw new InvalidValueError("INVALID_FORMAT", "billingDay")
	}
	const anchorDate = firstNominalDate(
		today,
		input.intervalUnit,
		billingMonth as number | null,
		billingDay as number,
		input.holidayAdjustment,
	)
	return {
		name: name.value,
		amount: amount.value,
		categoryId,
		intervalUnit: input.intervalUnit,
		billingMonth: billingMonth as number | null,
		billingDay: billingDay as number,
		anchorDate,
		nextNominalDate: anchorDate,
		holidayAdjustment: input.holidayAdjustment,
	}
}

export class Subscription {
	constructor(
		readonly id: string,
		readonly householdId: HouseholdId,
		readonly fields: SubscriptionFields,
		readonly occurrenceIndex: number,
		readonly scheduleVersion: number,
		readonly endedAt: string | null,
	) {}

	get nextPaymentDate(): string {
		return paymentDate(this.fields.nextNominalDate, this.fields.holidayAdjustment)
	}

	get monthlyAmount(): number {
		return monthlyEquivalent(this.fields.amount, this.fields.intervalUnit)
	}

	upcomingAt(today: string): Readonly<{ nominal: string; payment: string }> {
		for (let index = this.occurrenceIndex; index < this.occurrenceIndex + 10_000; index += 1) {
			const nominal = nominalDateForBillingDay(
				this.fields.anchorDate,
				this.fields.intervalUnit,
				this.fields.billingDay,
				index,
			)
			const payment = paymentDate(nominal, this.fields.holidayAdjustment)
			if (payment >= today) return { nominal, payment }
		}
		throw new Error("Subscription has no upcoming payment in the supported range")
	}

	change(fields: SubscriptionFields): Subscription {
		return new Subscription(this.id, this.householdId, fields, 0, this.scheduleVersion + 1, null)
	}

	end(endedAt: string): Subscription {
		return new Subscription(
			this.id,
			this.householdId,
			this.fields,
			this.occurrenceIndex,
			this.scheduleVersion,
			endedAt,
		)
	}

	equals(other: Subscription): boolean {
		return this.id === other.id
	}
}
