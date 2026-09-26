import { describe, expect, it } from "vitest"
import { getDateInTokyo, getMonthStartInTokyo } from "./calendar"

describe("Tokyo calendar", () => {
	it("uses the date and month in Asia/Tokyo", () => {
		// Arrange
		const beforeTokyoMidnight = new Date("2026-08-31T14:59:59.000Z")
		const atTokyoMidnight = new Date("2026-08-31T15:00:00.000Z")

		// Act
		const result = {
			dateBeforeMidnight: getDateInTokyo(beforeTokyoMidnight),
			dateAtMidnight: getDateInTokyo(atTokyoMidnight),
			monthBeforeMidnight: getMonthStartInTokyo(beforeTokyoMidnight),
			monthAtMidnight: getMonthStartInTokyo(atTokyoMidnight),
		}

		// Assert
		expect(result).toEqual({
			dateBeforeMidnight: "2026-08-31",
			dateAtMidnight: "2026-09-01",
			monthBeforeMidnight: "2026-08-01",
			monthAtMidnight: "2026-09-01",
		})
	})
})
