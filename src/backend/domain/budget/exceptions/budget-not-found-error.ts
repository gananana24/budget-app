export class BudgetNotFoundError extends Error {
	constructor() {
		super("Budget not found")
		this.name = "BudgetNotFoundError"
	}
}
