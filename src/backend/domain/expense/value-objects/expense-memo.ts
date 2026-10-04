import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"

function characterCount(value: string): number {
	return [...value].length
}

export class ExpenseMemo {
	private constructor(readonly value: string) {}

	static from(value: unknown): ExpenseMemo | null {
		if (value === null || value === undefined) {
			return null
		}
		if (typeof value !== "string") {
			throw new InvalidValueError("INVALID_FORMAT")
		}

		const normalized = value.trim()
		if (normalized.length === 0) {
			return null
		}
		if (characterCount(normalized) > 500) {
			throw new InvalidValueError("OUT_OF_RANGE")
		}

		return new ExpenseMemo(normalized)
	}

	equals(other: ExpenseMemo): boolean {
		return this.value === other.value
	}
}
