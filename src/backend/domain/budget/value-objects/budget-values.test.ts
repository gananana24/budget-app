import { describe, expect, it } from "vitest"
import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { BudgetAmount } from "./budget-amount"
import { MonthStart } from "./month-start"

describe("BudgetAmount", () => {
	it("allows an explicit zero budget", () => {
		// Arrange
		const amount = 0

		// Act
		const result = BudgetAmount.from(amount)

		// Assert
		expect(result.value).toBe(amount)
	})

	it("rejects a budget above the PostgreSQL integer limit", () => {
		// Arrange
		const createAmount = () => BudgetAmount.from(2_147_483_648)

		// Act
		const result = createAmount

		// Assert
		expect(result).toThrow(InvalidValueError)
	})
})

describe("MonthStart", () => {
	it("accepts only the first day of a real month", () => {
		// Arrange
		const month = "2026-09-01"

		// Act
		const result = MonthStart.from(month)

		// Assert
		expect(result.value).toBe(month)
	})

	it("rejects a date other than the first day as a month", () => {
		// Arrange
		const createMonth = () => MonthStart.from("2026-09-02")

		// Act
		const result = createMonth

		// Assert
		expect(result).toThrow(InvalidValueError)
	})
})
