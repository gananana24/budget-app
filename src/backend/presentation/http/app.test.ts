import { afterEach, describe, expect, it, vi } from "vitest"
import { ApplicationError } from "../../application/errors/application-error"
import { createHttpApp } from "./app"
import { createAuthenticatedUserMiddleware, getAuthenticatedUser } from "./authentication"

afterEach(() => {
	vi.restoreAllMocks()
})

describe("HTTP app", () => {
	function createAuthenticatedApp() {
		return createHttpApp({
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => "clerk_user_verified")],
		})
	}

	it.each([
		["VALIDATION_ERROR", 400],
		["UNAUTHORIZED", 401],
		["NOT_FOUND", 404],
		["CONFLICT", 409],
	] as const)("maps %s to the common error response", async (code, status) => {
		// Arrange
		const app = createAuthenticatedApp()
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
		const app = createAuthenticatedApp()

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
		const app = createAuthenticatedApp()
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

	it("rejects an unauthenticated API request before routing", async () => {
		// Arrange
		const app = createHttpApp({
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => null)],
		})

		// Act
		const response = await app.request("/api/missing")

		// Assert
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({
			error: { code: "UNAUTHORIZED", fields: {} },
		})
	})

	it("leaves non-API routes public for the application shell", async () => {
		// Arrange
		const app = createHttpApp({
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => null)],
		})

		// Act
		const response = await app.request("/missing")

		// Assert
		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({
			error: { code: "NOT_FOUND", fields: {} },
		})
	})

	it("uses the verified Clerk user instead of a client-provided user ID", async () => {
		// Arrange
		const app = createAuthenticatedApp()
		app.post("/api/protected", (context) => context.json(getAuthenticatedUser(context)))
		const request = new Request("http://localhost/api/protected", {
			method: "POST",
			headers: {
				"content-type": "application/json",
				"x-user-id": "clerk_user_spoofed",
			},
			body: JSON.stringify({ userId: "clerk_user_spoofed" }),
		})

		// Act
		const response = await app.request(request)

		// Assert
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual({ clerkUserId: "clerk_user_verified" })
	})
})
