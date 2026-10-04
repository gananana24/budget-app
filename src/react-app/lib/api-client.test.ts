import { describe, expect, it, vi } from "vitest"
import { ApiError, createApiClient } from "./api-client"

describe("API client", () => {
	it("attaches the Clerk session token and accepts an empty success response", async () => {
		// Arrange
		const fetch = vi
			.fn<typeof globalThis.fetch>()
			.mockResolvedValue(new Response(null, { status: 204 }))
		const client = createApiClient({
			fetch,
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})

		// Act
		await client.post("/api/bootstrap")

		// Assert
		expect(fetch).toHaveBeenCalledOnce()
		const [, init] = fetch.mock.calls[0]
		expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer session-token")
	})

	it("preserves the backend-managed error message", async () => {
		// Arrange
		const fetch = vi.fn<typeof globalThis.fetch>().mockResolvedValue(
			new Response(
				JSON.stringify({
					error: { code: "UNAUTHORIZED", message: "ログインしてください。", fields: {} },
				}),
				{
					status: 401,
					headers: { "Content-Type": "application/json" },
				},
			),
		)
		const client = createApiClient({
			fetch,
			getToken: async () => null,
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})

		// Act
		const request = client.post("/api/bootstrap")

		// Assert
		await expect(request).rejects.toMatchObject({ message: "ログインしてください。", status: 401 })
	})

	it("normalizes a transport failure", async () => {
		// Arrange
		const fetch = vi.fn<typeof globalThis.fetch>().mockRejectedValue(new TypeError("offline"))
		const client = createApiClient({
			fetch,
			getToken: async () => null,
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})

		// Act
		const request = client.post("/api/bootstrap")

		// Assert
		await expect(request).rejects.toBeInstanceOf(ApiError)
		await expect(request).rejects.toMatchObject({ message: "通信エラー", status: undefined })
	})

	it("does not expose an authentication SDK failure", async () => {
		// Arrange
		const secret = "sensitive token failure"
		const client = createApiClient({
			fetch: vi.fn<typeof globalThis.fetch>(),
			getToken: async () => {
				throw new Error(secret)
			},
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})

		// Act
		const request = client.post("/api/bootstrap")

		// Assert
		await expect(request).rejects.toMatchObject({ message: "通信エラー" })
		await expect(request).rejects.not.toMatchObject({ message: secret })
	})
})
