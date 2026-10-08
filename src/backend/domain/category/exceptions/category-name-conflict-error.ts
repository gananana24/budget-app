export class CategoryNameConflictError extends Error {
	constructor() {
		super("Category name is already in use")
		this.name = "CategoryNameConflictError"
	}
}
