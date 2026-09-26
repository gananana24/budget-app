const TOKYO_TIME_ZONE = "Asia/Tokyo"

function getTokyoDateParts(instant: Date): Readonly<{ year: string; month: string; day: string }> {
	const parts = new Intl.DateTimeFormat("en-US", {
		timeZone: TOKYO_TIME_ZONE,
		year: "numeric",
		month: "2-digit",
		day: "2-digit",
	}).formatToParts(instant)
	const year = parts.find((part) => part.type === "year")?.value
	const month = parts.find((part) => part.type === "month")?.value
	const day = parts.find((part) => part.type === "day")?.value

	if (!year || !month || !day) {
		throw new Error("Failed to resolve the current date")
	}

	return { year, month, day }
}

export function getDateInTokyo(instant: Date): string {
	const { year, month, day } = getTokyoDateParts(instant)
	return `${year}-${month}-${day}`
}

export function getMonthStartInTokyo(instant: Date): string {
	const { year, month } = getTokyoDateParts(instant)
	return `${year}-${month}-01`
}
