// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { routeTree } from "../../app/route-tree.gen"
import { createApiClient } from "../../lib/api-client"
import { ApiClientProvider } from "../../lib/api-client-context"
import type { MonthlyOverview } from "../monthly/api/monthly-overview"
import type { BudgetDraft } from "./api/budgets"

const foodId = "00000000-0000-4000-8000-000000000001"
const travelId = "00000000-0000-4000-8000-000000000002"

function overview(
	month: string,
	foodBudget: number | null,
	initialized = foodBudget !== null,
): MonthlyOverview {
	return {
		month,
		initialized,
		totals: { budget: foodBudget ?? 0, expenses: 200, remaining: (foodBudget ?? 0) - 200 },
		uncategorized: { expenses: 0 },
		categories: [
			{
				id: foodId,
				name: "食費",
				iconName: "utensils",
				budget: foodBudget === null ? { status: "unset" } : { status: "set", amount: foodBudget },
				expenses: 200,
				remaining: foodBudget === null ? null : foodBudget - 200,
			},
			{
				id: travelId,
				name: "交通費",
				iconName: "train-front",
				budget: { status: "unset" },
				expenses: 0,
				remaining: null,
			},
		],
		expenses: [],
	}
}

function renderBudget(fetch: typeof globalThis.fetch, path = "/budget") {
	const apiClient = createApiClient({
		fetch,
		getToken: async () => "session-token",
		networkErrorMessage: "通信エラー",
		invalidResponseMessage: "応答エラー",
	})
	const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [path] }),
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

describe("monthly budget editing", () => {
	it("shows inherited values as a draft and saves only filled categories for the selected month", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		let storedFood: number | null = null
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			const path = String(input)
			if (init?.method === "PUT") {
				storedFood = 0
				return Response.json({
					month: "2026-09-01",
					initialized: true,
					budgets: [{ categoryId: foodId, amount: 0 }],
				})
			}
			if (path.endsWith("/budget-draft")) {
				const draft: BudgetDraft = {
					month: "2026-09-01",
					initialized: storedFood !== null,
					budgets: [
						{ categoryId: foodId, amount: 0 },
						...(storedFood === null ? [{ categoryId: travelId, amount: 1000 }] : []),
					],
				}
				return Response.json(draft)
			}
			return Response.json(overview("2026-09-01", storedFood))
		})
		const user = userEvent.setup()
		renderBudget(fetch, "/budget?month=2026-09")
		await screen.findByRole("textbox", { name: "食費" })

		// Act
		expect(screen.getByRole("textbox", { name: "食費" })).toHaveValue("0")
		expect(screen.getByRole("textbox", { name: "交通費" })).toHaveValue("1000")
		expect(fetch.mock.calls.every(([, init]) => init?.method === "GET")).toBe(true)
		await user.clear(screen.getByRole("textbox", { name: "交通費" }))
		await user.click(screen.getByRole("button", { name: "入力した予算を保存" }))

		// Assert
		await waitFor(() => expect(storedFood).toBe(0))
		expect(fetch).toHaveBeenCalledWith(
			"/api/months/2026-09-01/budgets",
			expect.objectContaining({
				method: "PUT",
				body: JSON.stringify({ budgets: [{ categoryId: foodId, amount: 0 }] }),
			}),
		)
		await screen.findByText("現在の予算: ￥0")
		expect(screen.queryByText(/この月の予算はまだ確定していません/)).not.toBeInTheDocument()
	})

	it("rejects an empty save and preserves inputs after a lock conflict", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			if (init?.method === "PUT") {
				return Response.json(
					{ error: { message: "競合しました。再試行してください。", fields: {} } },
					{ status: 409 },
				)
			}
			if (String(input).endsWith("/budget-draft")) {
				return Response.json({ month: "2026-10-01", initialized: true, budgets: [] })
			}
			return Response.json(overview("2026-10-01", null))
		})
		const user = userEvent.setup()
		renderBudget(fetch)
		await screen.findByRole("textbox", { name: "食費" })

		// Act
		await user.click(screen.getByRole("button", { name: "入力した予算を保存" }))
		expect(screen.getByRole("alert")).toHaveTextContent("金額を1件以上入力してください")
		await user.type(screen.getByRole("textbox", { name: "食費" }), "350")
		await user.click(screen.getByRole("button", { name: "入力した予算を保存" }))

		// Assert
		await screen.findByText("競合しました。再試行してください。")
		expect(screen.getByRole("textbox", { name: "食費" })).toHaveValue("350")
		expect(fetch.mock.calls.filter(([, init]) => init?.method === "PUT")).toHaveLength(1)
	})

	it("refreshes the home budget and remaining amount after saving the current month", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		let storedFood = 100
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			if (init?.method === "PUT") {
				storedFood = 500
				return Response.json({
					month: "2026-10-01",
					initialized: true,
					budgets: [{ categoryId: foodId, amount: storedFood }],
				})
			}
			if (String(input).endsWith("/budget-draft")) {
				return Response.json({
					month: "2026-10-01",
					initialized: true,
					budgets: [{ categoryId: foodId, amount: storedFood }],
				})
			}
			return Response.json(overview("2026-10-01", storedFood, true))
		})
		const user = userEvent.setup()
		renderBudget(fetch)
		await screen.findByRole("textbox", { name: "食費" })

		// Act
		await user.clear(screen.getByRole("textbox", { name: "食費" }))
		await user.type(screen.getByRole("textbox", { name: "食費" }), "500")
		await user.click(screen.getByRole("button", { name: "入力した予算を保存" }))
		await screen.findByText("現在の予算: ￥500")
		await user.click(screen.getByRole("link", { name: "ホーム" }))

		// Assert
		expect(await screen.findByText("￥300")).toBeInTheDocument()
		expect(screen.getByText("予算 ￥500")).toBeInTheDocument()
	})

	it("confirms deletion with the saved amount and refreshes the home summary", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		let storedFood: number | null = 100
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			if (init?.method === "DELETE") {
				storedFood = null
				return new Response(null, { status: 204 })
			}
			if (String(input).endsWith("/budget-draft")) {
				return Response.json({
					month: "2026-10-01",
					initialized: true,
					budgets: storedFood === null ? [] : [{ categoryId: foodId, amount: storedFood }],
				})
			}
			return Response.json(overview("2026-10-01", storedFood, true))
		})
		const user = userEvent.setup()
		renderBudget(fetch)
		await screen.findByRole("textbox", { name: "食費" })

		// Act
		await user.click(screen.getByRole("button", { name: "予算を削除" }))
		const dialog = screen.getByRole("alertdialog")
		expect(
			within(dialog).getByText(
				/2026年10月の「食費」の現在の予算は￥100です。削除すると未設定に戻します。/,
			),
		).toBeInTheDocument()
		await user.click(within(dialog).getByRole("button", { name: "未設定に戻す" }))
		await waitFor(() =>
			expect(screen.queryByRole("button", { name: "予算を削除" })).not.toBeInTheDocument(),
		)
		await user.click(screen.getByRole("link", { name: "ホーム" }))

		// Assert
		expect(fetch).toHaveBeenCalledWith(
			`/api/months/2026-10-01/budgets/${foodId}`,
			expect.objectContaining({ method: "DELETE" }),
		)
		expect((await screen.findAllByText("予算未設定")).length).toBeGreaterThan(0)
	})
})
