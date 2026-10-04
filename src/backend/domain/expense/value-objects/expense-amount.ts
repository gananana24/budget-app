import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"

const MAX_POSTGRES_INTEGER = 2_147_483_647

export class ExpenseAmount {
	private constructor(readonly value: number) {}

	static from(value: unknown): ExpenseAmount {
		if (
			typeof value !== "number" ||
			!Number.isSafeInteger(value) ||
			value < 1 ||
			value > MAX_POSTGRES_INTEGER
		) {
			throw new InvalidValueError("OUT_OF_RANGE")
		}

		return new ExpenseAmount(value)
	}

	equals(other: ExpenseAmount): boolean {
		return this.value === other.value
	}
}
