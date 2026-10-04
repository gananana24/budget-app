export class NotFoundError extends Error {
	constructor() {
		super("The requested resource was not found")
		this.name = "NotFoundError"
	}
}
