export type InvalidValueReason = "INVALID_FORMAT" | "OUT_OF_RANGE" | "REQUIRED"

export class InvalidValueError extends Error {
	constructor(readonly reason: InvalidValueReason) {
		super(reason)
		this.name = "InvalidValueError"
	}
}
