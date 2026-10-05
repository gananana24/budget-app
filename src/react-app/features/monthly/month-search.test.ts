import { afterEach, describe, expect, it, vi } from "vitest"
import { validateMonthSearch } from "./month-search"

afterEach(() => {
	vi.useRealTimers()
})

describe("month search", () => {
	it("keeps a past month in year-month URL format", () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))

		// Act
		const result = validateMonthSearch({ month: "2026-09" })

		// Assert
		expect(result).toEqual({ month: "2026-09" })
	})

	it("discards date-shaped and future month values", () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))

		// Act
		const dateShaped = validateMonthSearch({ month: "2026-09-01" })
		const futureMonth = validateMonthSearch({ month: "2026-11" })

		// Assert
		expect(dateShaped).toEqual({})
		expect(futureMonth).toEqual({})
	})
})
