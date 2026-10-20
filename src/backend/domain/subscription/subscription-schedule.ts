import holidayJp from "@holiday-jp/holiday_jp"
import { InvalidValueError } from "../shared/exceptions/invalid-value-error"

export type IntervalUnit = "month" | "year"
export type HolidayAdjustment = "none" | "previous" | "next"

export function parseDate(value: unknown, field = "nextNominalDate"): string {
	if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
		throw new InvalidValueError("INVALID_FORMAT", field)
	}
	const date = new Date(`${value}T00:00:00Z`)
	if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
		throw new InvalidValueError("INVALID_FORMAT", field)
	}
	return value
}

function utcDate(value: string): Date {
	return new Date(`${value}T00:00:00Z`)
}

function isoDate(date: Date): string {
	return date.toISOString().slice(0, 10)
}

function moveDays(value: string, days: number): string {
	const date = utcDate(value)
	date.setUTCDate(date.getUTCDate() + days)
	return isoDate(date)
}

export function nominalDateForBillingDay(
	anchor: string,
	unit: IntervalUnit,
	billingDay: number,
	index: number,
): string {
	const start = utcDate(anchor)
	const months = (unit === "year" ? 12 : 1) * index
	const target = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + months, 1))
	const lastDay = new Date(
		Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0),
	).getUTCDate()
	target.setUTCDate(Math.min(billingDay, lastDay))
	return isoDate(target)
}

export function firstNominalDate(
	today: string,
	unit: IntervalUnit,
	billingMonth: number | null,
	billingDay: number,
	adjustment: HolidayAdjustment,
): string {
	const year = Number(today.slice(0, 4))
	const month = unit === "month" ? Number(today.slice(5, 7)) : billingMonth!
	const anchor = `${year}-${String(month).padStart(2, "0")}-01`
	for (let index = 0; index < 2; index += 1) {
		const nominal = nominalDateForBillingDay(anchor, unit, billingDay, index)
		if (paymentDate(nominal, adjustment) >= today) return nominal
	}
	throw new Error("Subscription has no upcoming payment")
}

export function isJapaneseBankHoliday(value: string): boolean {
	const date = utcDate(value)
	const day = date.getUTCDay()
	const monthDay = value.slice(5)
	return (
		day === 0 ||
		day === 6 ||
		monthDay === "12-31" ||
		monthDay === "01-02" ||
		monthDay === "01-03" ||
		holidayJp.isHoliday(value)
	)
}

export function paymentDate(nominal: string, adjustment: HolidayAdjustment): string {
	if (adjustment === "none") return nominal
	const direction = adjustment === "previous" ? -1 : 1
	const next = (date: string): string => moveDays(date, direction)
	const candidate = next(nominal)
	if (!isJapaneseBankHoliday(nominal)) return nominal
	const findBusinessDay = (date: string): string =>
		isJapaneseBankHoliday(date) ? findBusinessDay(next(date)) : date
	return findBusinessDay(candidate)
}

export function monthlyEquivalent(amount: number, unit: IntervalUnit): number {
	return unit === "year" ? amount / 12 : amount
}
