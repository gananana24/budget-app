// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { routeTree } from "../../app/route-tree.gen"
import { createApiClient } from "../../lib/api-client"
import { ApiClientProvider } from "../../lib/api-client-context"

vi.mock("@clerk/react", () => ({ UserButton: () => <button type="button">アカウント</button> }))

describe("settings screen", () => {
	it("shows settings destinations and opens category management on a separate screen", async () => {
		// Arrange
		const user = userEvent.setup()
		const client = createApiClient({
			fetch: vi.fn<typeof globalThis.fetch>(async () => Response.json({ categories: [] })),
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const router = createRouter({
			routeTree,
			history: createMemoryHistory({ initialEntries: ["/settings"] }),
		})
		render(
			<QueryClientProvider
				client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
			>
				<ApiClientProvider client={client}>
					<RouterProvider router={router} />
				</ApiClientProvider>
			</QueryClientProvider>,
		)
		await screen.findByRole("heading", { name: "設定" })

		// Act
		await user.click(screen.getByRole("link", { name: "カテゴリー" }))

		// Assert
		expect(router.state.location.pathname).toBe("/settings/categories")
		expect(await screen.findByRole("heading", { name: "カテゴリー" })).toBeInTheDocument()
		expect(screen.queryByRole("heading", { name: "アカウント" })).not.toBeInTheDocument()
	})
})
