import { lucideIconNames } from "../../../../shared/lucide-icon-names"
import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"

const availableNames = new Set<string>(lucideIconNames)

export class CategoryIconName {
	private constructor(readonly value: string) {}

	static from(value: unknown): CategoryIconName {
		if (typeof value !== "string" || !availableNames.has(value)) {
			throw new InvalidValueError("INVALID_FORMAT", "iconName")
		}
		return new CategoryIconName(value)
	}
}
