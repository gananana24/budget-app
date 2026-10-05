const locale = "ja-JP"
const timeZone = "Asia/Tokyo"

const yenFormatter = new Intl.NumberFormat(locale, {
	style: "currency",
	currency: "JPY",
	currencyDisplay: "symbol",
	maximumFractionDigits: 0,
})

const dateFormatter = new Intl.DateTimeFormat(locale, {
	year: "numeric",
	month: "long",
	day: "numeric",
	timeZone,
})

const monthFormatter = new Intl.DateTimeFormat(locale, {
	year: "numeric",
	month: "long",
	timeZone,
})

function parseCalendarDate(value: string): Date {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
	if (!match) {
		throw new RangeError(`Invalid calendar date: ${value}`)
	}

	const [, year, month, day] = match
	return new Date(`${year}-${month}-${day}T00:00:00+09:00`)
}

export function formatYen(amount: number): string {
	return yenFormatter.format(amount)
}

export function formatDate(date: Date | string): string {
	return dateFormatter.format(typeof date === "string" ? parseCalendarDate(date) : date)
}

export function formatMonth(date: Date | string): string {
	return monthFormatter.format(typeof date === "string" ? parseCalendarDate(date) : date)
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
