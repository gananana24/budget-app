import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { LocalDate } from "../../shared/value-objects/local-date"

export class ExpenseDate {
	private constructor(readonly value: string) {}

	static from(value: unknown, todayInTokyo: LocalDate): ExpenseDate {
		const date = LocalDate.from(value)
		if (date.value > todayInTokyo.value) {
			throw new InvalidValueError("OUT_OF_RANGE")
		}

		return new ExpenseDate(date.value)
	}

	equals(other: ExpenseDate): boolean {
		return this.value === other.value
	}
}
