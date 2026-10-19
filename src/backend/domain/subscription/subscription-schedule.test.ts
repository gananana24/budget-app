import { describe, expect, it } from "vitest"
import {
	firstNominalDate,
	monthlyEquivalent,
	nominalDateForBillingDay,
	paymentDate,
} from "./subscription-schedule"

describe("subscription payment calendar", () => {
	it("returns to the original day after a short month", () => {
		// Arrange
		const anchor = "2027-01-31"

		// Act
		const dates = [0, 1, 2].map((index) => nominalDateForBillingDay(anchor, "month", 31, index))

		// Assert
		expect(dates).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"])
	})

	it("uses the last day of February for annual leap-day payments", () => {
		// Arrange
		const anchor = "2024-02-29"

		// Act
		const dates = [1, 2, 3, 4].map((index) => nominalDateForBillingDay(anchor, "year", 29, index))

		// Assert
		expect(dates).toEqual(["2025-02-28", "2026-02-28", "2027-02-28", "2028-02-29"])
	})

	it("moves across Golden Week to the next Japanese banking day", () => {
		// Arrange
		const nominal = "2026-05-03"

		// Act
		const actual = paymentDate(nominal, "next")

		// Assert
		expect(actual).toBe("2026-05-07")
	})

	it("moves a New Year's holiday into the previous month", () => {
		// Arrange
		const nominal = "2026-01-01"

		// Act
		const actual = paymentDate(nominal, "previous")

		// Assert
		expect(actual).toBe("2025-12-30")
	})

	it("calculates an annual charge as a monthly commitment", () => {
		// Arrange
		const amount = 12000

		// Act
		const average = monthlyEquivalent(amount, "year")

		// Assert
		expect(average).toBe(1000)
	})

	it("keeps the chosen annual leap day when the first due year is not a leap year", () => {
		// Arrange
		const today = "2026-01-01"

		// Act
		const first = firstNominalDate(today, "year", 2, 29, "none")
		const later = nominalDateForBillingDay(first, "year", 29, 2)

		// Assert
		expect(first).toBe("2026-02-28")
		expect(later).toBe("2028-02-29")
	})

	it("starts a monthly plan at the next payment after a holiday adjustment", () => {
		// Arrange
		const today = "2026-05-03"

		// Act
		const next = firstNominalDate(today, "month", null, 3, "previous")

		// Assert
		expect(next).toBe("2026-06-03")
	})
})
