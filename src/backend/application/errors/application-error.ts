export type ApplicationErrorCode = "CONFLICT" | "NOT_FOUND" | "UNAUTHORIZED" | "VALIDATION_ERROR"

export class ApplicationError extends Error {
	readonly code: ApplicationErrorCode
	readonly fields: Readonly<Record<string, string>>

	constructor(code: ApplicationErrorCode, fields: Readonly<Record<string, string>> = {}) {
		super(code)
		this.name = "ApplicationError"
		this.code = code
		this.fields = fields
	}
}
