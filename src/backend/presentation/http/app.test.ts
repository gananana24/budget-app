import { afterEach, describe, expect, it, vi } from "vitest"
import { ApplicationError } from "../../application/errors/application-error"
import { createHttpApp } from "./app"

afterEach(() => {
	vi.restoreAllMocks()
})

describe("HTTP app", () => {
	it.each([
		["VALIDATION_ERROR", 400],
		["UNAUTHORIZED", 401],
		["NOT_FOUND", 404],
		["CONFLICT", 409],
	] as const)("maps %s to the common error response", async (code, status) => {
		// Arrange
		const app = createHttpApp()
		app.get("/api/error", () => {
			throw new ApplicationError(code, { operation: "RETRY" })
		})

		// Act
		const response = await app.request("/api/error")

		// Assert
		expect(response.status).toBe(status)
		expect(await response.json()).toEqual({
			error: { code, fields: { operation: "RETRY" } },
		})
	})

	it("converts an unknown route to the common not-found response", async () => {
		// Arrange
		const app = createHttpApp()

		// Act
		const response = await app.request("/api/missing")

		// Assert
		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({
			error: { code: "NOT_FOUND", fields: {} },
		})
	})

	it("does not expose unexpected error details", async () => {
		// Arrange
		const secret = "postgresql://user:password@secret.example/database"
		const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined)
		const app = createHttpApp()
		app.get("/api/failure", () => {
			throw new Error(secret)
		})

		// Act
		const response = await app.request("/api/failure")

		// Assert
		const body = await response.text()
		const log = consoleError.mock.calls.flat().join(" ")

		expect(response.status).toBe(500)
		expect(JSON.parse(body)).toEqual({
			error: { code: "INTERNAL_ERROR", fields: {} },
		})
		expect(body).not.toContain(secret)
		expect(log).not.toContain(secret)
	})
})
