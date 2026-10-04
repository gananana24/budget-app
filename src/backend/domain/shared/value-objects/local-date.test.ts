import { describe, expect, it } from "vitest"
import { InvalidValueError } from "../exceptions/invalid-value-error"
import { LocalDate } from "./local-date"

describe("LocalDate", () => {
	it("accepts a real ISO date", () => {
		// Arrange
		const value = "2024-02-29"

		// Act
		const result = LocalDate.from(value)

		// Assert
		expect(result.value).toBe(value)
	})

	it.each(["2026-02-29", "2026-9-01"])("rejects the invalid date %s", (value) => {
		// Arrange
		const createDate = () => LocalDate.from(value)

		// Act
		const result = createDate

		// Assert
		expect(result).toThrow(InvalidValueError)
	})
})
