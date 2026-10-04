import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"

function characterCount(value: string): number {
	return [...value].length
}

export class CategoryName {
	private constructor(readonly value: string) {}

	static from(value: unknown): CategoryName {
		if (typeof value !== "string") {
			throw new InvalidValueError("INVALID_FORMAT")
		}

		const normalized = value.trim()
		if (normalized.length === 0) {
			throw new InvalidValueError("REQUIRED")
		}
		if (characterCount(normalized) > 50) {
			throw new InvalidValueError("OUT_OF_RANGE")
		}

		return new CategoryName(normalized)
	}

	equals(other: CategoryName): boolean {
		return this.value === other.value
	}
}
