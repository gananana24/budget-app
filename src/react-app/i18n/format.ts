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
