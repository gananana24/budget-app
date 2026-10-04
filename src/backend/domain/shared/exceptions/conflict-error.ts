export class ConflictError extends Error {
	constructor(readonly fields: Readonly<Record<string, string>> = {}) {
		super("The operation conflicts with the current state")
		this.name = "ConflictError"
	}
}
