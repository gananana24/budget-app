export class ExpenseCategoryNotFoundError extends Error {
	constructor() {
		super("Expense category was not found")
		this.name = "ExpenseCategoryNotFoundError"
	}
}
