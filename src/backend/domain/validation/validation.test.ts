import { describe, expect, it } from "vitest"
import { validateDate, validateExpenseDate, validateMonth } from "./date"
import { validateBudgetAmount, validateExpenseAmount } from "./money"
import { normalizeCategoryName, normalizeMemo } from "./text"

describe("date validation", () => {
	it("accepts a real ISO date", () => {
		// Arrange
		const value = "2024-02-29"

		// Act
		const result = validateDate(value)

		// Assert
		expect(result).toEqual({ success: true, value })
	})

	it.each(["2026-02-29", "2026-9-01"])("rejects the invalid date %s", (value) => {
		// Arrange
		const expected = { success: false, code: "INVALID_FORMAT" }

		// Act
		const result = validateDate(value)

		// Assert
		expect(result).toEqual(expected)
	})

	it("rejects a future expense date using the supplied Tokyo date", () => {
		// Arrange
		const todayInTokyo = "2026-09-23"

		// Act
		const result = validateExpenseDate("2026-09-24", todayInTokyo)

		// Assert
		expect(result).toEqual({
			success: false,
			code: "OUT_OF_RANGE",
		})
	})

	it("accepts only the first day of a month", () => {
		// Arrange
		const month = "2026-09-01"

		// Act
		const result = validateMonth(month)

		// Assert
		expect(result).toEqual({ success: true, value: month })
	})

	it("rejects a date other than the first day as a month", () => {
		// Arrange
		const value = "2026-09-02"

		// Act
		const result = validateMonth(value)

		// Assert
		expect(result).toEqual({ success: false, code: "INVALID_FORMAT" })
	})
})

describe("money validation", () => {
	it.each([1, 2_147_483_647])("accepts the expense amount %s", (amount) => {
		// Arrange
		const expected = { success: true, value: amount }

		// Act
		const result = validateExpenseAmount(amount)

		// Assert
		expect(result).toEqual(expected)
	})

	it.each([0, 1.5, "100"])("rejects the expense amount %s", (amount) => {
		// Arrange
		const expected = { success: false, code: "OUT_OF_RANGE" }

		// Act
		const result = validateExpenseAmount(amount)

		// Assert
		expect(result).toEqual(expected)
	})

	it("allows an explicit zero budget", () => {
		// Arrange
		const amount = 0

		// Act
		const result = validateBudgetAmount(amount)

		// Assert
		expect(result).toEqual({ success: true, value: amount })
	})

	it("rejects a budget above the PostgreSQL integer limit", () => {
		// Arrange
		const amount = 2_147_483_648

		// Act
		const result = validateBudgetAmount(amount)

		// Assert
		expect(result).toEqual({ success: false, code: "OUT_OF_RANGE" })
	})
})

describe("text normalization", () => {
	it("trims surrounding whitespace from a memo", () => {
		// Arrange
		const memo = "  lunch  "

		// Act
		const result = normalizeMemo(memo)

		// Assert
		expect(result).toEqual({ success: true, value: "lunch" })
	})

	it("converts a blank memo to null", () => {
		// Arrange
		const memo = " \n "

		// Act
		const result = normalizeMemo(memo)

		// Assert
		expect(result).toEqual({ success: true, value: null })
	})

	it.each([
		["memo", "😀".repeat(500), true],
		["memo", "😀".repeat(501), false],
		["category", "食".repeat(50), true],
		["category", "食".repeat(51), false],
	] as const)("counts Unicode code points for a %s", (kind, value, success) => {
		// Arrange
		const normalize = kind === "memo" ? normalizeMemo : normalizeCategoryName

		// Act
		const result = normalize(value)

		// Assert
		expect(result.success).toBe(success)
	})

	it("requires a non-blank category name", () => {
		// Arrange
		const name = "  "

		// Act
		const result = normalizeCategoryName(name)

		// Assert
		expect(result).toEqual({ success: false, code: "REQUIRED" })
	})
})
