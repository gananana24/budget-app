// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { createApiClient } from "../../lib/api-client"
import { ApiClientProvider } from "../../lib/api-client-context"
import type { MonthlyOverview } from "../monthly/api/monthly-overview"
import { ExpensesScreen } from "./expenses-screen"

const EMPTY_OVERVIEW: MonthlyOverview = {
	month: "2026-10-01",
	initialized: true,
	totals: { budget: 0, expenses: 0, remaining: 0 },
	uncategorized: { expenses: 0 },
	categories: [
		{
			id: "00000000-0000-4000-8000-000000000020",
			name: "食費",
			budget: { status: "unset" },
			expenses: 0,
			remaining: null,
		},
	],
	expenses: [],
}

afterEach(() => {
	vi.useRealTimers()
})

describe("expenses screen", () => {
	it("keeps date, amount, category, and memo in keyboard order", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const client = createApiClient({
			fetch: vi.fn<typeof globalThis.fetch>(),
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		queryClient.setQueryData(["monthly-overview", "2026-10-01"], EMPTY_OVERVIEW)
		const user = userEvent.setup()
		render(
			<QueryClientProvider client={queryClient}>
				<ApiClientProvider client={client}>
					<ExpensesScreen />
				</ApiClientProvider>
			</QueryClientProvider>,
		)

		// Act
		const focusOrder: string[] = []
		for (const _ of [0, 1, 2, 3]) {
			await user.tab()
			focusOrder.push(document.activeElement?.id ?? "")
		}

		// Assert
		expect(focusOrder).toEqual([
			"expense-date",
			"expense-amount",
			"expense-category",
			"expense-memo",
		])
	})

	it("registers an uncategorized expense and refreshes the monthly list", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const createdExpense = {
			id: "00000000-0000-4000-8000-000000000030",
			date: "2026-10-05",
			amount: 1_200,
			categoryId: null,
			memo: "夕食",
			createdAt: "2026-10-05T03:00:00.000Z",
			updatedAt: "2026-10-05T03:00:00.000Z",
		}
		let isCreated = false
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			const path = String(input)
			if (path === "/api/expenses" && init?.method === "POST") {
				isCreated = true
				return Response.json(createdExpense, { status: 201 })
			}

			const overview = isCreated
				? {
						...EMPTY_OVERVIEW,
						totals: { budget: 0, expenses: 1_200, remaining: -1_200 },
						uncategorized: { expenses: 1_200 },
						expenses: [createdExpense],
					}
				: EMPTY_OVERVIEW
			return Response.json(overview)
		})
		const client = createApiClient({
			fetch,
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const user = userEvent.setup()
		render(
			<QueryClientProvider client={queryClient}>
				<ApiClientProvider client={client}>
					<ExpensesScreen />
				</ApiClientProvider>
			</QueryClientProvider>,
		)
		await screen.findByRole("heading", { name: "支出を登録" })
		const categoryTrigger = screen.getByRole("combobox", { name: "費目" })
		expect(categoryTrigger).toHaveTextContent("未分類")

		// Act
		await user.click(categoryTrigger)
		await user.click(await screen.findByRole("option", { name: "食費" }))
		expect(categoryTrigger).toHaveTextContent("食費")
		await user.click(categoryTrigger)
		await user.click(await screen.findByRole("option", { name: "未分類" }))
		await user.type(screen.getByLabelText("金額"), "1200")
		await user.type(screen.getByLabelText("メモ（任意）"), "  夕食  ")
		await user.click(screen.getByRole("button", { name: "登録する" }))

		// Assert
		await screen.findByText("支出を登録しました。")
		expect(categoryTrigger).toHaveTextContent("未分類")
		expect(await screen.findAllByText("￥1,200")).toHaveLength(2)
		const postCall = fetch.mock.calls.find(([, init]) => init?.method === "POST")
		expect(postCall).toBeDefined()
		expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
			date: "2026-10-05",
			amount: 1_200,
			categoryId: null,
			memo: "夕食",
		})
	})
})
