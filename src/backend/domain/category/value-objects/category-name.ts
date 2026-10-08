import { InvalidValueError } from "../../shared/exceptions/invalid-value-error"
import { normalizeCategoryName } from "../../validation/text"

export class CategoryName {
	private constructor(readonly value: string) {}

	static from(value: unknown): CategoryName {
		const result = normalizeCategoryName(value)
		if (!result.success) throw new InvalidValueError(result.code, "name")
		return new CategoryName(result.value)
	}
}
