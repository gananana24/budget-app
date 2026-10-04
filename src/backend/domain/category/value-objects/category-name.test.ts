import { describe, expect, it } from "vitest"
import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { CategoryName } from "./category-name"

describe("CategoryName", () => {
	it("trims a category name", () => {
		// Arrange
		const name = "  食費  "

		// Act
		const result = CategoryName.from(name)

		// Assert
		expect(result.value).toBe("食費")
	})

	it("rejects a blank category name", () => {
		// Arrange
		const createName = () => CategoryName.from("   ")

		// Act
		const result = createName

		// Assert
		expect(result).toThrow(InvalidValueError)
	})

	it.each([
		["食".repeat(50), true],
		["食".repeat(51), false],
	] as const)("counts Unicode code points at the 50-character boundary", (name, isValid) => {
		// Arrange
		const createName = () => CategoryName.from(name)

		// Act
		const result = isValid ? createName() : createName

		// Assert
		if (isValid) {
			expect(result).toBeInstanceOf(CategoryName)
			return
		}
		expect(result).toThrow(InvalidValueError)
	})
})
