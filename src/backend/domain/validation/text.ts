import { invalid, type ValidationResult, valid } from "./result"

function characterCount(value: string): number {
	return [...value].length
}

export function normalizeMemo(value: unknown): ValidationResult<string | null> {
	if (value === null || value === undefined) {
		return valid(null)
	}

	if (typeof value !== "string") {
		return invalid("INVALID_FORMAT")
	}

	const normalized = value.trim()
	if (normalized.length === 0) {
		return valid(null)
	}

	if (characterCount(normalized) > 500) {
		return invalid("OUT_OF_RANGE")
	}

	return valid(normalized)
}

export function normalizeCategoryName(value: unknown): ValidationResult<string> {
	if (typeof value !== "string") {
		return invalid("INVALID_FORMAT")
	}

	const normalized = value.trim()
	if (normalized.length === 0) {
		return invalid("REQUIRED")
	}

	if (characterCount(normalized) > 50) {
		return invalid("OUT_OF_RANGE")
	}

	return valid(normalized)
}
