export type ValidationErrorCode = "INVALID_FORMAT" | "OUT_OF_RANGE" | "REQUIRED"

export type ValidationResult<T> =
	| Readonly<{ success: true; value: T }>
	| Readonly<{ success: false; code: ValidationErrorCode }>

export function valid<T>(value: T): ValidationResult<T> {
	return { success: true, value }
}

export function invalid<T>(code: ValidationErrorCode): ValidationResult<T> {
	return { success: false, code }
}
