import { describe, expect, it } from "vitest"
import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { CategoryIconName } from "./category-icon-name"

describe("category icon name", () => {
	it("accepts a Lucide icon name available in the installed catalog", () => {
		// Arrange
		const input = "paw-print"

		// Act
		const result = CategoryIconName.from(input)

		// Assert
		expect(result.value).toBe("paw-print")
	})

	it.each(["does-not-exist", "", 10, null])("rejects an unavailable icon name: %s", (input) => {
		// Arrange
		const value = input

		// Act
		const result = () => CategoryIconName.from(value)

		// Assert
		expect(result).toThrow(InvalidValueError)
	})
})
