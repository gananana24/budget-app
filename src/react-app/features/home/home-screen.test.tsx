// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { routeTree } from "../../app/route-tree.gen"
import { createApiClient } from "../../lib/api-client"
import { ApiClientProvider } from "../../lib/api-client-context"
import type { MonthlyOverview } from "../monthly/api/monthly-overview"

const CURRENT_OVERVIEW: MonthlyOverview = {
	month: "2026-10-01",
	initialized: true,
	totals: { budget: 10_000, expenses: 12_000, remaining: -2_000 },
	uncategorized: { expenses: 1_000 },
	categories: [
		{
			id: "food",
			name: "食費",
			budget: { status: "set", amount: 10_000 },
			expenses: 11_000,
			remaining: -1_000,
		},
		{ id: "daily", name: "日用品", budget: { status: "unset" }, expenses: 0, remaining: null },
		{
			id: "transport",
			name: "交通費",
			budget: { status: "set", amount: 0 },
			expenses: 0,
			remaining: 0,
		},
	],
	expenses: [],
}

function renderHome(fetch: typeof globalThis.fetch, initialPath = "/") {
	const apiClient = createApiClient({
		fetch,
		getToken: async () => "session-token",
		networkErrorMessage: "通信エラー",
		invalidResponseMessage: "応答エラー",
	})
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	})
	render(
		<QueryClientProvider client={queryClient}>
			<ApiClientProvider client={apiClient}>
				<RouterProvider router={router} />
			</ApiClientProvider>
		</QueryClientProvider>,
	)
	return router
}

afterEach(() => vi.useRealTimers())

describe("monthly home", () => {
	it("distinguishes an exceeded budget from an unset category budget", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(CURRENT_OVERVIEW))

		// Act
		renderHome(fetch)
		await screen.findByRole("heading", { name: "費目別の状況" })

		// Assert
		expect(screen.getByText("予算超過", { selector: "p" })).toBeInTheDocument()
		expect(screen.getAllByText("予算未設定")).toHaveLength(1)
		expect(screen.getByText("予算 ￥10,000")).toBeInTheDocument()
		expect(screen.getByText("予算 ￥0")).toBeInTheDocument()
		expect(screen.getByText("未分類の支出 ￥1,000")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "次の月" })).toBeDisabled()
	})

	it("opens an uninitialized past month without sending a write request", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const pastOverview: MonthlyOverview = {
			...CURRENT_OVERVIEW,
			month: "2026-09-01",
			initialized: false,
			totals: { budget: 0, expenses: 0, remaining: 0 },
			uncategorized: { expenses: 0 },
			categories: CURRENT_OVERVIEW.categories.map((category) => ({
				...category,
				budget: { status: "unset" },
				expenses: 0,
				remaining: null,
			})),
		}
		const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
			Response.json(String(input).includes("2026-09-01") ? pastOverview : CURRENT_OVERVIEW),
		)
		const user = userEvent.setup()
		const router = renderHome(fetch)
		await screen.findByRole("heading", { name: "2026年10月" })

		// Act
		await user.click(screen.getByRole("button", { name: "前の月" }))
		await screen.findByRole("heading", { name: "2026年9月" })

		// Assert
		expect(router.state.location.search.month).toBe("2026-09")
		expect(screen.getAllByText("予算未設定")).toHaveLength(5)
		expect(screen.getByRole("link", { name: "支出をすべて見る" })).toHaveAttribute(
			"href",
			"/expenses?month=2026-09",
		)
		expect(screen.getByRole("link", { name: "支出を追加" })).toHaveAttribute(
			"href",
			"/expenses/new?month=2026-09",
		)
		expect(fetch.mock.calls.map(([input]) => String(input))).toContain("/api/months/2026-09-01")
		expect(
			fetch.mock.calls.every(([, init]) => init?.method === undefined || init.method === "GET"),
		).toBe(true)
	})

	it("opens an arbitrary past month from its URL", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(CURRENT_OVERVIEW))

		// Act
		const router = renderHome(fetch, "/?month=2024-02")
		await screen.findByRole("heading", { name: "2024年2月" })

		// Assert
		expect(router.state.location.search.month).toBe("2024-02")
		expect(fetch.mock.calls.map(([input]) => String(input))).toContain("/api/months/2024-02-01")
	})
})
