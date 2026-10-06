import { afterEach, describe, expect, it, vi } from "vitest"
import { UnauthorizedError } from "../../domain/authentication/exceptions/unauthorized-error"
import { BootstrapRequiredError } from "../../domain/authorization/exceptions/bootstrap-required-error"
import { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { HouseholdId } from "../../domain/household/value-objects/household-id"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"
import { UserId } from "../../domain/user/value-objects/user-id"
import { createHttpApp } from "./app"
import { createAuthenticatedUserMiddleware, getAuthenticatedClerkUserId } from "./authentication"

afterEach(() => {
	vi.restoreAllMocks()
})

function createAuthorizationContext(): AuthorizationContext {
	return new AuthorizationContext(
		UserId.from("00000000-0000-4000-8000-000000000001"),
		HouseholdId.from("00000000-0000-4000-8000-000000000002"),
	)
}

function unusedMonthlyDependencies() {
	return {
		resolveAuthorizationUseCase: {
			execute: async () => {
				throw new Error("Authorization is not expected in this test")
			},
		},
		getMonthlyOverviewUseCase: {
			execute: async () => {
				throw new Error("Monthly overview is not expected in this test")
			},
		},
		createExpenseUseCase: {
			execute: async () => {
				throw new Error("Expense creation is not expected in this test")
			},
		},
	}
}

function expectedFields(code: string): Readonly<Record<string, string>> {
	if (code === "VALIDATION_ERROR") {
		return { reason: "OUT_OF_RANGE" }
	}
	return {}
}

function expectedMessage(code: string): string {
	switch (code) {
		case "VALIDATION_ERROR":
			return "入力内容を確認してください。"
		case "UNAUTHORIZED":
			return "ログインを確認できませんでした。もう一度ログインしてからお試しください。"
		case "BOOTSTRAP_REQUIRED":
			return "家計簿の準備が完了していません。"
		default:
			throw new Error(`Unexpected test error code: ${code}`)
	}
}

describe("HTTP app", () => {
	function createAuthenticatedApp() {
		return createHttpApp({
			...unusedMonthlyDependencies(),
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => "clerk_user_verified")],
			bootstrapUseCase: {
				execute: async () => {
					throw new Error("Bootstrap is not expected in this test")
				},
			},
		})
	}

	it.each([
		["VALIDATION_ERROR", new InvalidValueError("OUT_OF_RANGE"), 400],
		["UNAUTHORIZED", new UnauthorizedError(), 401],
		["BOOTSTRAP_REQUIRED", new BootstrapRequiredError(), 409],
	] as const)("maps %s to the common error response", async (code, error, status) => {
		// Arrange
		const app = createAuthenticatedApp()
		app.get("/api/error", () => {
			throw error
		})

		// Act
		const response = await app.request("/api/error")

		// Assert
		expect(response.status).toBe(status)
		expect(await response.json()).toEqual({
			error: { code, message: expectedMessage(code), fields: expectedFields(code) },
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
			error: {
				code: "NOT_FOUND",
				message: "指定された情報が見つかりませんでした。",
				fields: {},
			},
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
			error: {
				code: "INTERNAL_ERROR",
				message: "処理を完了できませんでした。しばらくしてから、もう一度お試しください。",
				fields: {},
			},
		})
		expect(body).not.toContain(secret)
		expect(log).not.toContain(secret)
	})

	it("rejects an unauthenticated API request before routing", async () => {
		// Arrange
		const app = createHttpApp({
			...unusedMonthlyDependencies(),
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => null)],
			bootstrapUseCase: {
				execute: async () => {
					throw new Error("Bootstrap is not expected in this test")
				},
			},
		})

		// Act
		const response = await app.request("/api/missing")

		// Assert
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({
			error: {
				code: "UNAUTHORIZED",
				message: "ログインを確認できませんでした。もう一度ログインしてからお試しください。",
				fields: {},
			},
		})
	})

	it("rejects a malformed authenticated user ID as unauthorized", async () => {
		// Arrange
		const app = createHttpApp({
			...unusedMonthlyDependencies(),
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => "   ")],
			bootstrapUseCase: {
				execute: async () => {
					throw new Error("Bootstrap is not expected in this test")
				},
			},
		})

		// Act
		const response = await app.request("/api/bootstrap", { method: "POST" })

		// Assert
		expect(response.status).toBe(401)
		expect(await response.json()).toEqual({
			error: {
				code: "UNAUTHORIZED",
				message: "ログインを確認できませんでした。もう一度ログインしてからお試しください。",
				fields: {},
			},
		})
	})

	it("leaves non-API routes public for the application shell", async () => {
		// Arrange
		const app = createHttpApp({
			...unusedMonthlyDependencies(),
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => null)],
			bootstrapUseCase: {
				execute: async () => {
					throw new Error("Bootstrap is not expected in this test")
				},
			},
		})

		// Act
		const response = await app.request("/missing")

		// Assert
		expect(response.status).toBe(404)
		expect(await response.json()).toEqual({
			error: {
				code: "NOT_FOUND",
				message: "指定された情報が見つかりませんでした。",
				fields: {},
			},
		})
	})

	it("uses the verified Clerk user instead of a client-provided user ID", async () => {
		// Arrange
		const app = createAuthenticatedApp()
		app.post("/api/protected", (context) =>
			context.json({ clerkUserId: getAuthenticatedClerkUserId(context).value }),
		)
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

	it("bootstraps the verified Clerk user without returning internal IDs", async () => {
		// Arrange
		let bootstrappedClerkUserId: string | undefined
		const app = createHttpApp({
			...unusedMonthlyDependencies(),
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => "clerk_user_verified")],
			bootstrapUseCase: {
				execute: async (clerkUserId) => {
					bootstrappedClerkUserId = clerkUserId.value
					return createAuthorizationContext()
				},
			},
		})
		const request = new Request("http://localhost/api/bootstrap", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				clerkUserId: "clerk_user_spoofed",
				householdId: "household_spoofed",
				month: "2000-01-01",
			}),
		})

		// Act
		const response = await app.request(request)

		// Assert
		expect(response.status).toBe(204)
		expect(await response.text()).toBe("")
		expect(bootstrappedClerkUserId).toBe("clerk_user_verified")
	})

	it("returns the authenticated household monthly overview", async () => {
		// Arrange
		const authorization = createAuthorizationContext()
		let resolvedClerkUserId: string | undefined
		let requestedMonth: unknown
		const overview = {
			month: "2026-09-01",
			initialized: false,
			totals: { budget: 0, expenses: 1_200, remaining: -1_200 },
			uncategorized: { expenses: 1_200 },
			categories: [],
			expenses: [],
		}
		const app = createHttpApp({
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => "clerk_user_verified")],
			bootstrapUseCase: {
				execute: async () => {
					throw new Error("Bootstrap is not expected in this test")
				},
			},
			resolveAuthorizationUseCase: {
				execute: async (clerkUserId) => {
					resolvedClerkUserId = clerkUserId.value
					return authorization
				},
			},
			getMonthlyOverviewUseCase: {
				execute: async (input) => {
					requestedMonth = input.month
					expect(input.authorization).toBe(authorization)
					return overview
				},
			},
			createExpenseUseCase: {
				execute: async () => {
					throw new Error("Expense creation is not expected in this test")
				},
			},
		})

		// Act
		const response = await app.request("/api/months/2026-09-01")

		// Assert
		expect(response.status).toBe(200)
		expect(await response.json()).toEqual(overview)
		expect(resolvedClerkUserId).toBe("clerk_user_verified")
		expect(requestedMonth).toBe("2026-09-01")
	})

	it("creates an expense for the authenticated household", async () => {
		// Arrange
		const authorization = createAuthorizationContext()
		let receivedInput: Record<string, unknown> | undefined
		const createdExpense = {
			id: "00000000-0000-4000-8000-000000000003",
			date: "2026-10-05",
			amount: 1_200,
			categoryId: null,
			memo: "夕食",
		}
		const app = createHttpApp({
			...unusedMonthlyDependencies(),
			authenticationMiddleware: [createAuthenticatedUserMiddleware(() => "clerk_user_verified")],
			bootstrapUseCase: {
				execute: async () => {
					throw new Error("Bootstrap is not expected in this test")
				},
			},
			resolveAuthorizationUseCase: {
				execute: async () => authorization,
			},
			createExpenseUseCase: {
				execute: async (input) => {
					receivedInput = input
					return createdExpense
				},
			},
		})

		// Act
		const response = await app.request("/api/expenses", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: JSON.stringify({
				date: "2026-10-05",
				amount: 1_200,
				categoryId: null,
				memo: "  夕食  ",
				householdId: "client-controlled-household",
			}),
		})

		// Assert
		expect(response.status).toBe(201)
		expect(await response.json()).toEqual(createdExpense)
		expect(receivedInput).toEqual({
			authorization,
			date: "2026-10-05",
			amount: 1_200,
			categoryId: null,
			memo: "  夕食  ",
		})
	})

	it("rejects malformed expense JSON with a validation response", async () => {
		// Arrange
		const app = createAuthenticatedApp()

		// Act
		const response = await app.request("/api/expenses", {
			method: "POST",
			headers: { "content-type": "application/json" },
			body: "{invalid",
		})

		// Assert
		expect(response.status).toBe(400)
		expect(await response.json()).toEqual({
			error: {
				code: "VALIDATION_ERROR",
				message: "入力内容を確認してください。",
				fields: { reason: "INVALID_FORMAT" },
			},
		})
	})
})
