import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { getMonthStartInTokyo } from "../../shared/services/tokyo-calendar"
import { LocalDate } from "../../shared/value-objects/local-date"

const ISO_MONTH_PATTERN = /^\d{4}-\d{2}-01$/

export class MonthStart {
	private constructor(readonly value: string) {}

	static from(value: unknown): MonthStart {
		if (typeof value !== "string" || !ISO_MONTH_PATTERN.test(value)) {
			throw new InvalidValueError("INVALID_FORMAT")
		}

		LocalDate.from(value)
		return new MonthStart(value)
	}

	static fromInstantInTokyo(instant: Date): MonthStart {
		return MonthStart.from(getMonthStartInTokyo(instant))
	}

	equals(other: MonthStart): boolean {
		return this.value === other.value
	}
}
