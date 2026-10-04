import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { getMonthStartInTokyo } from "../../shared/services/tokyo-calendar"
import { validateMonth } from "../../validation/date"

export class MonthStart {
	private constructor(readonly value: string) {}

	static from(value: unknown): MonthStart {
		const result = validateMonth(value)
		if (!result.success) {
			throw new InvalidValueError(result.code)
		}

		return new MonthStart(result.value)
	}

	static fromInstantInTokyo(instant: Date): MonthStart {
		return MonthStart.from(getMonthStartInTokyo(instant))
	}

	equals(other: MonthStart): boolean {
		return this.value === other.value
	}
}
