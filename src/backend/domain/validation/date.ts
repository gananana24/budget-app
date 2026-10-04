import { invalid, type ValidationResult, valid } from "./result"

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/
const ISO_MONTH_PATTERN = /^(\d{4})-(\d{2})-01$/

function isRealIsoDate(value: string): boolean {
	const match = ISO_DATE_PATTERN.exec(value)
	if (!match) {
		return false
	}

	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	if (year < 1 || month < 1 || month > 12 || day < 1) {
		return false
	}

	const lastDayOfMonth = new Date(Date.UTC(year, month, 0)).getUTCDate()
	return day <= lastDayOfMonth
}

export function validateDate(value: unknown): ValidationResult<string> {
	if (typeof value !== "string" || !isRealIsoDate(value)) {
		return invalid("INVALID_FORMAT")
	}

	return valid(value)
}

export function validateExpenseDate(
	value: unknown,
	todayInTokyo: string,
): ValidationResult<string> {
	const result = validateDate(value)
	if (!result.success) {
		return result
	}

	if (!isRealIsoDate(todayInTokyo) || result.value > todayInTokyo) {
		return invalid("OUT_OF_RANGE")
	}

	return result
}

export function validateMonth(value: unknown): ValidationResult<string> {
	if (typeof value !== "string" || !ISO_MONTH_PATTERN.test(value) || !isRealIsoDate(value)) {
		return invalid("INVALID_FORMAT")
	}

	return valid(value)
}
