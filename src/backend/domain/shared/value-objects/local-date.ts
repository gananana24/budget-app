import { InvalidValueError } from "../exceptions/invalid-value-error"

const ISO_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/

export class LocalDate {
	private constructor(readonly value: string) {}

	static from(value: unknown): LocalDate {
		if (typeof value !== "string" || !LocalDate.isRealIsoDate(value)) {
			throw new InvalidValueError("INVALID_FORMAT")
		}

		return new LocalDate(value)
	}

	equals(other: LocalDate): boolean {
		return this.value === other.value
	}

	private static isRealIsoDate(value: string): boolean {
		const match = ISO_DATE_PATTERN.exec(value)
		if (!match) {
			return false
		}

		const year = Number(match[1])
		const month = Number(match[2])
		const day = Number(match[3])
		if (year < 1 || month < 1 || month > 12 || day < 1) {
			return false
		}

		return day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
	}
}
