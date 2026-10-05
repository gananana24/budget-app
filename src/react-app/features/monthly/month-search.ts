import { getCurrentMonthStartInTokyo } from "../../i18n/format"

export function validateMonthSearch(search: Record<string, unknown>): { month?: string } {
	const value = search.month
	if (
		typeof value !== "string" ||
		!/^\d{4}-(0[1-9]|1[0-2])$/.test(value) ||
		value > getCurrentMonthStartInTokyo().slice(0, 7)
	) {
		return {}
	}
	return { month: value }
}
