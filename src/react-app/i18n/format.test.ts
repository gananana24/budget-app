import { describe, expect, it } from "vitest"
import {
	formatDate,
	formatMonth,
	formatYen,
	getCurrentMonthStartInTokyo,
	getTodayInTokyo,
} from "./format"

describe("Japanese formatters", () => {
	it("formats an amount as Japanese yen without decimal places", () => {
		// Arrange
		const amount = 123_456

		// Act
		const formatted = formatYen(amount)

		// Assert
		expect(formatted).toBe("￥123,456")
	})

	it("formats an API calendar date without shifting the day", () => {
		// Arrange
		const date = "2026-01-01"

		// Act
		const formatted = formatDate(date)

		// Assert
		expect(formatted).toBe("2026年1月1日")
	})

	it("formats the month in the Japan time zone", () => {
		// Arrange
		const instant = new Date("2026-09-30T15:00:00.000Z")

		// Act
		const formatted = formatMonth(instant)

		// Assert
		expect(formatted).toBe("2026年10月")
	})

	it("resolves the current date and month in Tokyo", () => {
		// Arrange
		const instant = new Date("2026-09-30T15:00:00.000Z")

		// Act
		const date = getTodayInTokyo(instant)
		const month = getCurrentMonthStartInTokyo(instant)

		// Assert
		expect(date).toBe("2026-10-01")
		expect(month).toBe("2026-10-01")
	})
})
