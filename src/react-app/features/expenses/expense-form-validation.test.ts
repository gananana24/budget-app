import { describe, expect, it } from "vitest"
import { validateExpenseForm } from "./expense-form-validation"

const VALID_VALUES = {
	date: "2026-10-05",
	amount: "1200",
	categoryId: "category-food",
	memo: "夕食",
} as const

describe("expense form validation", () => {
	it("accepts valid values from an available category", () => {
		// Arrange
		const categories = new Set(["category-food"])

		// Act
		const result = validateExpenseForm(VALID_VALUES, "2026-10-05", categories)

		// Assert
		expect(result).toEqual({})
	})

	it.each([
		["date", { ...VALID_VALUES, date: "2026-10-06" }],
		["amount", { ...VALID_VALUES, amount: "0" }],
		["amount", { ...VALID_VALUES, amount: "1.5" }],
		["categoryId", { ...VALID_VALUES, categoryId: "category-from-another-household" }],
		["memo", { ...VALID_VALUES, memo: "食".repeat(501) }],
	] as const)("rejects an invalid %s before submission", (field, values) => {
		// Arrange
		const categories = new Set(["category-food"])

		// Act
		const result = validateExpenseForm(values, "2026-10-05", categories)

		// Assert
		expect(result).toHaveProperty(field, "invalid")
	})

	it("allows an uncategorized expense with a blank memo", () => {
		// Arrange
		const values = { ...VALID_VALUES, categoryId: "", memo: "   " }

		// Act
		const result = validateExpenseForm(values, "2026-10-05", new Set())

		// Assert
		expect(result).toEqual({})
	})
})
