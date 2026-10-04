import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"

export class ClerkUserId {
	private constructor(readonly value: string) {}

	static from(value: unknown): ClerkUserId {
		if (typeof value !== "string" || value.trim().length === 0) {
			throw new InvalidValueError("REQUIRED")
		}

		return new ClerkUserId(value)
	}

	equals(other: ClerkUserId): boolean {
		return this.value === other.value
	}
}
