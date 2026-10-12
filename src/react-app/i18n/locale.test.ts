// @vitest-environment jsdom

import { afterEach, expect, it } from "vitest"
import { getLocale, setLocale } from "../paraglide/runtime.js"
import { categoryDisplayName } from "./category-name"
import { formatDate, formatMonth, formatYen } from "./format"
import { languageName, messages } from "./messages"

afterEach(() => {
	setLocale("ja", { reload: false })
})

it("displays English text, default category names, and Japanese yen formatting after selecting English", () => {
	// Arrange
	const initial = { name: "食費", seedKey: "food" }
	const custom = { name: "ペット", seedKey: null }

	// Act
	setLocale("en", { reload: false })

	// Assert
	expect(getLocale()).toBe("en")
	expect(localStorage.getItem("PARAGLIDE_LOCALE")).toBe("en")
	expect(messages.navigation.settings()).toBe("Settings")
	expect(categoryDisplayName(initial)).toBe("Food")
	expect(categoryDisplayName(custom)).toBe("ペット")
	expect(formatYen(1200)).toBe("¥1,200")
	expect(formatDate("2026-10-12")).toBe("October 12, 2026")
	expect(formatMonth("2026-10-01")).toBe("October 2026")
})

it("displays Spanish text and default category names after selecting Spanish", () => {
	// Arrange
	const initial = { name: "食費", seedKey: "food" }

	// Act
	setLocale("es", { reload: false })

	// Assert
	expect(getLocale()).toBe("es")
	expect(messages.navigation.settings()).toBe("Configuración")
	expect(messages.settings.languageSpanish()).toBe("Español")
	expect(languageName("es")).toBe("Español")
	expect(categoryDisplayName(initial)).toBe("Alimentación")
	expect(formatDate("2026-10-12")).toBe("12 de octubre de 2026")
	expect(formatMonth("2026-10-01")).toBe("octubre de 2026")
})
