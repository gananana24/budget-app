import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class ExpenseId {
	private constructor(readonly value: string) {}

	static generate(): ExpenseId {
		return new ExpenseId(crypto.randomUUID())
	}

	static from(value: unknown): ExpenseId {
		if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
			throw new InvalidValueError("INVALID_FORMAT")
		}

		return new ExpenseId(value)
	}

	equals(other: ExpenseId): boolean {
		return this.value === other.value
	}
}
