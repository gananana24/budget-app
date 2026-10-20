// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vitest"
import { routeTree } from "../../app/route-tree.gen"
import { createApiClient } from "../../lib/api-client"
import { ApiClientProvider } from "../../lib/api-client-context"

vi.mock("@clerk/react", () => ({ UserButton: () => <button type="button">アカウント</button> }))

const initial = {
	id: "00000000-0000-4000-8000-000000000001",
	name: "食費",
	seedKey: "food",
	iconName: "utensils",
	isInitial: true,
}
const custom = {
	id: "00000000-0000-4000-8000-000000000002",
	name: "ペット",
	seedKey: null,
	iconName: "paw-print",
	isInitial: false,
}

function renderSettings(fetch: typeof globalThis.fetch) {
	const client = createApiClient({
		fetch,
		getToken: async () => "session-token",
		networkErrorMessage: "通信エラー",
		invalidResponseMessage: "応答エラー",
	})
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: ["/settings/categories"] }),
	})
	render(
		<QueryClientProvider client={queryClient}>
			<ApiClientProvider client={client}>
				<RouterProvider router={router} />
			</ApiClientProvider>
		</QueryClientProvider>,
	)
	return queryClient
}

describe("settings category management", () => {
	it("shows initial categories without edit actions and explains deletion consequences", async () => {
		// Arrange
		const fetch = vi.fn<typeof globalThis.fetch>(async () =>
			Response.json({ categories: [initial, custom] }),
		)
		const user = userEvent.setup()
		renderSettings(fetch)
		await screen.findByText("ペット")

		// Act
		await user.click(screen.getByRole("button", { name: "ペットを削除" }))

		// Assert
		expect(screen.queryByRole("button", { name: "食費を削除" })).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "食費の名前を変更" })).not.toBeInTheDocument()
		expect(screen.getByText(/このカテゴリーを使った支出は未分類になります/)).toBeInTheDocument()
	})

	it("adds a trimmed category and refreshes the category list", async () => {
		// Arrange
		let categories = [initial, custom]
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			if (String(input) === "/api/categories" && init?.method === "POST") {
				const body = JSON.parse(String(init.body)) as { name: string; iconName: string }
				categories = [
					...categories,
					{
						id: "00000000-0000-4000-8000-000000000003",
						name: body.name,
						iconName: body.iconName,
						isInitial: false,
						seedKey: null,
					},
				]
				return Response.json(categories[categories.length - 1], { status: 201 })
			}
			return Response.json({ categories })
		})
		const user = userEvent.setup()
		renderSettings(fetch)
		await screen.findByText("ペット")

		// Act
		await user.click(screen.getByRole("button", { name: "アイコンを選ぶ" }))
		await user.click(await screen.findByRole("button", { name: "graduation-cap" }))
		await user.type(screen.getByRole("textbox", { name: "カテゴリー名" }), "  学費  ")
		await user.click(screen.getByRole("button", { name: "追加" }))

		// Assert
		expect(await screen.findByText("学費")).toBeInTheDocument()
		expect(fetch).toHaveBeenCalledWith(
			"/api/categories",
			expect.objectContaining({
				method: "POST",
				body: JSON.stringify({ name: "学費", iconName: "graduation-cap" }),
			}),
		)
	})

	it("shows the renamed category after saving", async () => {
		// Arrange
		let categories = [initial, custom]
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			if (String(input) === `/api/categories/${custom.id}` && init?.method === "PATCH") {
				const body = JSON.parse(String(init.body)) as { name: string; iconName: string }
				categories = categories.map((category) =>
					category.id === custom.id ? { ...category, ...body } : category,
				)
				return Response.json(categories[1])
			}
			return Response.json({ categories })
		})
		const user = userEvent.setup()
		renderSettings(fetch)
		await screen.findByText("ペット")

		// Act
		await user.click(screen.getByRole("button", { name: "ペットの名前を変更" }))
		const input = screen.getAllByRole("textbox", { name: "カテゴリー名" })[1]
		await user.clear(input)
		await user.type(input, "日用品")
		await user.click(screen.getByRole("button", { name: "カテゴリー名を保存" }))

		// Assert
		expect(await screen.findByText("日用品")).toBeInTheDocument()
		expect(screen.queryByText("ペット")).not.toBeInTheDocument()
	})

	it("removes a confirmed category from the list", async () => {
		// Arrange
		let categories = [initial, custom]
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			if (String(input) === `/api/categories/${custom.id}` && init?.method === "DELETE") {
				categories = [initial]
				return new Response(null, { status: 204 })
			}
			return Response.json({ categories })
		})
		const user = userEvent.setup()
		renderSettings(fetch)
		await screen.findByText("ペット")

		// Act
		await user.click(screen.getByRole("button", { name: "ペットを削除" }))
		await user.click(screen.getByRole("button", { name: "削除" }))

		// Assert
		await waitFor(() => expect(screen.queryByText("ペット")).not.toBeInTheDocument())
		expect(screen.getByText("食費")).toBeInTheDocument()
	})
})
