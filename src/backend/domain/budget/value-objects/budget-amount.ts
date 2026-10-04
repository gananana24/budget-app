import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"

const MAX_POSTGRES_INTEGER = 2_147_483_647

export class BudgetAmount {
	private constructor(readonly value: number) {}

	static from(value: unknown): BudgetAmount {
		if (
			typeof value !== "number" ||
			!Number.isSafeInteger(value) ||
			value < 0 ||
			value > MAX_POSTGRES_INTEGER
		) {
			throw new InvalidValueError("OUT_OF_RANGE")
		}

		return new BudgetAmount(value)
	}

	equals(other: BudgetAmount): boolean {
		return this.value === other.value
	}
}
