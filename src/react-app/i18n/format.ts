import { getLocale } from "../paraglide/runtime.js"

function displayLocale(): string {
	return getLocale() === "en" ? "en-US" : getLocale() === "es" ? "es-ES" : "ja-JP"
}
const timeZone = "Asia/Tokyo"

const currencyOptions = {
	style: "currency",
	currency: "JPY",
	currencyDisplay: "symbol",
	maximumFractionDigits: 0,
} as const

const dateOptions = {
	year: "numeric",
	month: "long",
	day: "numeric",
	timeZone,
} as const

const shortDateOptions = {
	month: "long",
	day: "numeric",
	timeZone,
} as const

const monthOptions = {
	year: "numeric",
	month: "long",
	timeZone,
} as const

function parseCalendarDate(value: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
	if (!match) {
		throw new RangeError(`Invalid calendar date: ${value}`)
	}

	const [, year, month, day] = match
	return new Date(`${year}-${month}-${day}T00:00:00+09:00`)
}

export function formatYen(amount: number): string {
	return new Intl.NumberFormat(displayLocale(), currencyOptions).format(amount)
}

export function formatDate(date: Date | string): string {
	return new Intl.DateTimeFormat(displayLocale(), dateOptions).format(
		typeof date === "string" ? parseCalendarDate(date) : date,
	)
}

export function formatShortDate(date: Date | string): string {
	return new Intl.DateTimeFormat(displayLocale(), shortDateOptions).format(
		typeof date === "string" ? parseCalendarDate(date) : date,
	)
}

export function formatMonth(date: Date | string): string {
	return new Intl.DateTimeFormat(displayLocale(), monthOptions).format(
		typeof date === "string" ? parseCalendarDate(date) : date,
	)
}

function getTokyoDateParts(date: Date): Readonly<{ year: string; month: string; day: string }> {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(date)
	const year = parts.find((part) => part.type === "year")?.value
	const month = parts.find((part) => part.type === "month")?.value
	const day = parts.find((part) => part.type === "day")?.value

	if (!year || !month || !day) {
		throw new Error("Failed to format a Tokyo calendar date")
	}

	return { year, month, day }
}

export function getTodayInTokyo(date = new Date()): string {
	const { year, month, day } = getTokyoDateParts(date)
	return `${year}-${month}-${day}`
}

export function getCurrentMonthStartInTokyo(date = new Date()): string {
	const { year, month } = getTokyoDateParts(date)
	return `${year}-${month}-01`
}

export function shiftMonth(monthStart: string, offset: number): string {
	const [year, month] = monthStart.split("-").map(Number)
	return `${new Date(Date.UTC(year, month - 1 + offset, 1)).toISOString().slice(0, 7)}-01`
}

export function suggestDateInMonth(monthStart: string, today: string): string {
	if (monthStart === `${today.slice(0, 7)}-01`) {
		return today
	}
	const [year, month] = monthStart.split("-").map(Number)
	const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
	const day = Math.min(Number(today.slice(-2)), lastDay)
		.toString()
		.padStart(2, "0")
	return `${monthStart.slice(0, 7)}-${day}`
}
