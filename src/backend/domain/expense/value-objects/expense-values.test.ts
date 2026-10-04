import { describe, expect, it } from "vitest"
import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { LocalDate } from "../../shared/value-objects/local-date"
import { ExpenseAmount } from "./expense-amount"
import { ExpenseDate } from "./expense-date"
import { ExpenseMemo } from "./expense-memo"

describe("ExpenseDate", () => {
	it("rejects a future date using the supplied Tokyo date", () => {
		// Arrange
		const todayInTokyo = LocalDate.from("2026-09-23")

		// Act
		const createDate = () => ExpenseDate.from("2026-09-24", todayInTokyo)

		// Assert
		expect(createDate).toThrow(InvalidValueError)
	})
})

describe("ExpenseAmount", () => {
	it.each([1, 2_147_483_647])("accepts the expense amount %s", (amount) => {
		// Arrange
		const value = amount

		// Act
		const result = ExpenseAmount.from(value)

		// Assert
		expect(result.value).toBe(value)
	})

	it.each([0, 1.5, "100"])("rejects the expense amount %s", (amount) => {
		// Arrange
		const createAmount = () => ExpenseAmount.from(amount)

		// Act
		const result = createAmount

		// Assert
		expect(result).toThrow(InvalidValueError)
	})
})

describe("ExpenseMemo", () => {
	it("trims a memo and converts blank text to no value", () => {
		// Arrange
		const memo = "  lunch  "

		// Act
		const result = {
			memo: ExpenseMemo.from(memo)?.value,
			blank: ExpenseMemo.from("   "),
		}

		// Assert
		expect(result).toEqual({ memo: "lunch", blank: null })
	})

	it.each([
		["😀".repeat(500), true],
		["😀".repeat(501), false],
	] as const)("counts Unicode code points at the 500-character boundary", (memo, isValid) => {
		// Arrange
		const createMemo = () => ExpenseMemo.from(memo)

		// Act
		const result = isValid ? createMemo() : createMemo

		// Assert
		if (isValid) {
			expect(result).toBeInstanceOf(ExpenseMemo)
			return
		}
		expect(result).toThrow(InvalidValueError)
	})
})
