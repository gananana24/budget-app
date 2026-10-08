export class CategoryNotFoundError extends Error {
	constructor() {
		super("Category was not found")
		this.name = "CategoryNotFoundError"
	}
}
