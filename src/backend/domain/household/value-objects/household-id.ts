import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class HouseholdId {
	private constructor(readonly value: string) {}

	static generate(): HouseholdId {
		return new HouseholdId(crypto.randomUUID())
	}

	static from(value: unknown): HouseholdId {
		if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
			throw new InvalidValueError("INVALID_FORMAT")
		}

		return new HouseholdId(value)
	}

	equals(other: HouseholdId): boolean {
		return this.value === other.value
	}
}
