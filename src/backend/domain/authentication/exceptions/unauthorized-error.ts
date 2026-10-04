export class UnauthorizedError extends Error {
	constructor() {
		super("Authentication is required")
		this.name = "UnauthorizedError"
	}
}
