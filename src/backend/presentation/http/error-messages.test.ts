import { expect, it } from "vitest"
import { errorMessage } from "./error-messages"

it("returns API errors in the requested language", () => {
	// Arrange
	const code = "CATEGORY_NAME_CONFLICT"

	// Act
	const english = errorMessage(code, "en")
	const japanese = errorMessage(code, "ja")
	const spanish = errorMessage(code, "es")

	// Assert
	expect(english).toBe("A category with this name already exists.")
	expect(japanese).toBe("同じ名前のカテゴリーがすでにあります。")
	expect(spanish).toBe("Ya existe una categoría con este nombre.")
})
