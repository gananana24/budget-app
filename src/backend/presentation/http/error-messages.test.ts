import { expect, it } from "vitest"
import { errorMessage } from "./error-messages"

it("returns English API errors for English requests and Japanese errors otherwise", () => {
	// Arrange
	const code = "CATEGORY_NAME_CONFLICT"

	// Act
	const english = errorMessage(code, "en")
	const japanese = errorMessage(code, "ja")

	// Assert
	expect(english).toBe("A category with this name already exists.")
	expect(japanese).toBe("同じ名前のカテゴリーがすでにあります。")
})
