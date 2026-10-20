export class SubscriptionNotFoundError extends Error {
	constructor() {
		super("Subscription was not found")
		this.name = "SubscriptionNotFoundError"
	}
}
