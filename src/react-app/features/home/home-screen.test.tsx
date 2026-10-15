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
	totals: { expenses: 12_000 },
	uncategorized: { expenses: 1_000 },
	categories: [
		{
			id: "food",
			name: "食費",
			seedKey: "food",
			iconName: "utensils",
			expenses: 10_500,
		},
		{
			id: "daily",
			name: "日用品",
			seedKey: null,
			iconName: "shopping-basket",
			expenses: 500,
		},
		{
			id: "transport",
			name: "交通費",
			seedKey: null,
			iconName: "train-front",
			expenses: 0,
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
	it("shows the current-month total and a compact category share", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(CURRENT_OVERVIEW))

		// Act
		renderHome(fetch)
		await screen.findByRole("region", { name: "支出の内訳" })

		// Assert
		expect(screen.getByRole("heading", { name: "今月の家計" })).toBeInTheDocument()
		expect(screen.getByText("2026年10月")).toBeInTheDocument()
		expect(screen.getByText("未分類")).toBeInTheDocument()
		expect(screen.queryByText("交通費")).not.toBeInTheDocument()
		expect(screen.queryByRole("button", { name: "前の月" })).not.toBeInTheDocument()
		expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
		expect(screen.queryByText("最近の支出")).not.toBeInTheDocument()
		expect(screen.getByText("￥10,500")).toBeInTheDocument()
	})

	it("shows three leading categories and groups remaining spending into Other", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const overview: MonthlyOverview = {
			...CURRENT_OVERVIEW,
			totals: { expenses: 12_500 },
			uncategorized: { expenses: 500 },
			categories: [
				{ ...CURRENT_OVERVIEW.categories[0], expenses: 8_000 },
				{ ...CURRENT_OVERVIEW.categories[1], expenses: 2_000 },
				{ ...CURRENT_OVERVIEW.categories[2], expenses: 1_000 },
				{
					id: "medical",
					name: "医療費",
					seedKey: "medical",
					iconName: "heart-pulse",
					expenses: 300,
				},
				{
					id: "utilities",
					name: "水道光熱費",
					seedKey: "utilities",
					iconName: "lightbulb",
					expenses: 200,
				},
				{
					id: "other",
					name: "その他",
					seedKey: "other",
					iconName: "circle-ellipsis",
					expenses: 500,
				},
			],
		}
		const fetch = vi.fn<typeof globalThis.fetch>(async () => Response.json(overview))

		// Act
		renderHome(fetch)
		await screen.findByText("その他")

		// Assert
		expect(screen.getByText("食費")).toBeInTheDocument()
		expect(screen.getByText("日用品")).toBeInTheDocument()
		expect(screen.getByText("交通費")).toBeInTheDocument()
		expect(screen.queryByText("医療費")).not.toBeInTheDocument()
		expect(screen.queryByText("未分類")).not.toBeInTheDocument()
		expect(screen.getAllByText("その他")).toHaveLength(1)
		expect(screen.getByText("￥8,000")).toBeInTheDocument()
		expect(screen.getByText("￥1,500")).toBeInTheDocument()
		expect(screen.queryByText("12%")).not.toBeInTheDocument()
		expect(screen.queryByText("水道光熱費")).not.toBeInTheDocument()
	})

	it("reads a past month from monthly details without a write request", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const pastOverview: MonthlyOverview = {
			...CURRENT_OVERVIEW,
			month: "2026-09-01",
			totals: { expenses: 0 },
			uncategorized: { expenses: 0 },
			categories: CURRENT_OVERVIEW.categories.map((category) => ({
				...category,
				expenses: 0,
			})),
		}
		const fetch = vi.fn<typeof globalThis.fetch>(async (input) =>
			Response.json(String(input).includes("2026-09-01") ? pastOverview : CURRENT_OVERVIEW),
		)
		const user = userEvent.setup()
		const router = renderHome(fetch, "/expenses")
		await screen.findByText("2026年10月")

		// Act
		await user.click(screen.getByRole("button", { name: "前の月" }))
		await screen.findByText("2026年9月")

		// Assert
		expect(router.state.location.search.month).toBe("2026-09")
		expect(screen.getByText("￥0")).toBeInTheDocument()
		expect(fetch.mock.calls.map(([input]) => String(input))).toContain("/api/months/2026-09-01")
		expect(
			fetch.mock.calls.every(([, init]) => init?.method === undefined || init.method === "GET"),
		).toBe(true)
	})
})
