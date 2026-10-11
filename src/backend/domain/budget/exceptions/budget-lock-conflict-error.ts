export class BudgetLockConflictError extends Error {
	constructor() {
		super("Budget operation could not acquire the household lock")
		this.name = "BudgetLockConflictError"
	}
}
