export class BootstrapRequiredError extends Error {
	constructor() {
		super("Bootstrap is required")
		this.name = "BootstrapRequiredError"
	}
}
