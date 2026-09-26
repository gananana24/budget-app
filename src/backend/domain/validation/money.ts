import { invalid, type ValidationResult, valid } from "./result"

const MAX_POSTGRES_INTEGER = 2_147_483_647

function validateIntegerInRange(value: unknown, minimum: number): ValidationResult<number> {
	if (
		typeof value !== "number" ||
		!Number.isSafeInteger(value) ||
		value < minimum ||
		value > MAX_POSTGRES_INTEGER
	) {
		return invalid("OUT_OF_RANGE")
	}

	return valid(value)
}

export function validateExpenseAmount(value: unknown): ValidationResult<number> {
	return validateIntegerInRange(value, 1)
}

export function validateBudgetAmount(value: unknown): ValidationResult<number> {
	return validateIntegerInRange(value, 0)
}
