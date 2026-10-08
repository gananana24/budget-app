// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { createMemoryHistory, createRouter, RouterProvider } from "@tanstack/react-router"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vitest"
import { routeTree } from "../../app/route-tree.gen"
import { createApiClient } from "../../lib/api-client"
import { ApiClientProvider } from "../../lib/api-client-context"
import type { MonthlyOverview } from "../monthly/api/monthly-overview"

const EMPTY_OVERVIEW: MonthlyOverview = {
	month: "2026-10-01",
	initialized: true,
	totals: { budget: 0, expenses: 0, remaining: 0 },
	uncategorized: { expenses: 0 },
	categories: [
		{
			id: "00000000-0000-4000-8000-000000000020",
			name: "食費",
			iconName: "utensils",
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

function renderExpenseFlow(
	client: ReturnType<typeof createApiClient>,
	queryClient: QueryClient,
	initialPath = "/expenses/new",
) {
	const router = createRouter({
		routeTree,
		history: createMemoryHistory({ initialEntries: [initialPath] }),
	})
	render(
		<QueryClientProvider client={queryClient}>
			<ApiClientProvider client={client}>
				<RouterProvider router={router} />
			</ApiClientProvider>
		</QueryClientProvider>,
	)
	return router
}

describe("expenses screen", () => {
	it("hides category filters when the selected month has no expenses", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const client = createApiClient({
			fetch: vi.fn<typeof globalThis.fetch>(async () => Response.json(EMPTY_OVERVIEW)),
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })

		// Act
		renderExpenseFlow(client, queryClient, "/expenses")
		await screen.findByText("支出はまだありません")

		// Assert
		expect(screen.queryByRole("group", { name: "カテゴリー" })).not.toBeInTheDocument()
		expect(screen.getByRole("link", { name: "支出を追加" })).toBeInTheDocument()
	})

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
		renderExpenseFlow(client, queryClient)
		await screen.findByRole("heading", { name: "支出を追加" })

		// Act
		const focusOrder: string[] = []
		for (const _ of [0, 1, 2, 3, 4]) {
			await user.tab()
			focusOrder.push(document.activeElement?.id ?? "")
		}

		// Assert
		expect(focusOrder).toEqual([
			"",
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
		const router = renderExpenseFlow(client, queryClient)
		await screen.findByRole("heading", { name: "支出を追加" })
		const categoryTrigger = await screen.findByRole("combobox", { name: "カテゴリー" })
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
		await waitFor(() => expect(router.state.location.pathname).toBe("/expenses"))
		expect(screen.getByText("2026年10月")).toBeInTheDocument()
		expect(await screen.findAllByText("￥1,200")).toHaveLength(3)
		expect(
			screen
				.getByRole("list", { name: "2026年10月の支出" })
				.compareDocumentPosition(screen.getByRole("heading", { name: "カテゴリーごとの支出" })) &
				Node.DOCUMENT_POSITION_FOLLOWING,
		).toBeTruthy()
		const postCall = fetch.mock.calls.find(([, init]) => init?.method === "POST")
		expect(postCall).toBeDefined()
		expect(JSON.parse(String(postCall?.[1]?.body))).toEqual({
			date: "2026-10-05",
			amount: 1_200,
			categoryId: null,
			memo: "夕食",
		})
	})

	it("shows the previous month's expenses after moving backward", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const septemberExpense = {
			id: "00000000-0000-4000-8000-000000000031",
			date: "2026-09-30",
			amount: 800,
			categoryId: null,
			memo: "先月の支出",
			createdAt: "2026-09-30T03:00:00.000Z",
			updatedAt: "2026-09-30T03:00:00.000Z",
		}
		const fetch = vi.fn<typeof globalThis.fetch>(async (input) => {
			const isSeptember = String(input).includes("2026-09-01")
			return Response.json(
				isSeptember
					? { ...EMPTY_OVERVIEW, month: "2026-09-01", expenses: [septemberExpense] }
					: EMPTY_OVERVIEW,
			)
		})
		const client = createApiClient({
			fetch,
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const user = userEvent.setup()
		renderExpenseFlow(client, queryClient, "/expenses")
		await screen.findByText("2026年10月")

		// Act
		await user.click(screen.getByRole("button", { name: "前の月" }))

		// Assert
		expect(await screen.findByText("2026年9月")).toBeInTheDocument()
		expect(await screen.findByText("先月の支出")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "次の月" })).toBeEnabled()
		expect(screen.getByRole("link", { name: "支出を追加" })).toHaveAttribute(
			"href",
			"/expenses/new?month=2026-09",
		)
	})

	it("opens the new screen in the selected month and returns to that month after saving", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-31T00:00:00.000Z"))
		const februaryOverview = { ...EMPTY_OVERVIEW, month: "2026-02-01" }
		const createdExpense = {
			id: "00000000-0000-4000-8000-000000000032",
			date: "2026-02-28",
			amount: 500,
			categoryId: null,
			memo: null,
			createdAt: "2026-10-31T03:00:00.000Z",
			updatedAt: "2026-10-31T03:00:00.000Z",
		}
		const fetch = vi.fn<typeof globalThis.fetch>(async (input, init) => {
			if (String(input) === "/api/expenses" && init?.method === "POST") {
				return Response.json(createdExpense, { status: 201 })
			}
			return Response.json({ ...februaryOverview, expenses: [createdExpense] })
		})
		const client = createApiClient({
			fetch,
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		queryClient.setQueryData(["monthly-overview", "2026-02-01"], februaryOverview)
		const user = userEvent.setup()
		const router = renderExpenseFlow(client, queryClient, "/expenses/new?month=2026-02")
		await screen.findByRole("button", { name: "日付" })
		expect(screen.getByRole("button", { name: "日付" })).toHaveTextContent("2026年2月28日")

		// Act
		await user.type(screen.getByLabelText("金額"), "500")
		await user.click(screen.getByRole("button", { name: "登録する" }))

		// Assert
		await waitFor(() => expect(router.state.location.pathname).toBe("/expenses"))
		expect(router.state.location.search.month).toBe("2026-02")
		expect(await screen.findByText("2026年2月")).toBeInTheDocument()
		const postCall = fetch.mock.calls.find(([, init]) => init?.method === "POST")
		expect(JSON.parse(String(postCall?.[1]?.body)).date).toBe("2026-02-28")
	})

	it("returns to the current month and stops at it", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const client = createApiClient({
			fetch: vi.fn<typeof globalThis.fetch>(async () => Response.json(EMPTY_OVERVIEW)),
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const user = userEvent.setup()
		renderExpenseFlow(client, queryClient, "/expenses?month=2026-09")
		await screen.findByText("2026年9月")

		// Act
		await user.click(screen.getByRole("button", { name: "次の月" }))

		// Assert
		expect(await screen.findByText("2026年10月")).toBeInTheDocument()
		expect(screen.getByRole("button", { name: "次の月" })).toBeDisabled()
	})

	it("returns from the new screen to the selected month's list", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const client = createApiClient({
			fetch: vi.fn<typeof globalThis.fetch>(async () =>
				Response.json({ ...EMPTY_OVERVIEW, month: "2026-09-01" }),
			),
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const user = userEvent.setup()
		const router = renderExpenseFlow(client, queryClient, "/expenses/new?month=2026-09")
		await screen.findByRole("heading", { name: "支出を追加" })

		// Act
		await user.click(screen.getByRole("link", { name: "支出" }))

		// Assert
		await waitFor(() => expect(router.state.location.pathname).toBe("/expenses"))
		expect(router.state.location.search.month).toBe("2026-09")
		expect(await screen.findByText("2026年9月")).toBeInTheDocument()
	})

	it("filters the monthly list by category and uncategorized expenses", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const expenses = [
			{
				id: "expense-food",
				date: "2026-10-05",
				amount: 500,
				categoryId: EMPTY_OVERVIEW.categories[0].id,
				memo: "昼食",
				createdAt: "2026-10-05",
				updatedAt: "2026-10-05",
			},
			{
				id: "expense-other",
				date: "2026-10-04",
				amount: 300,
				categoryId: null,
				memo: "その他",
				createdAt: "2026-10-04",
				updatedAt: "2026-10-04",
			},
		]
		const overview = {
			...EMPTY_OVERVIEW,
			categories: [
				...EMPTY_OVERVIEW.categories,
				{
					id: "00000000-0000-4000-8000-000000000021",
					name: "日用品",
					iconName: "shopping-basket",
					budget: { status: "unset" as const },
					expenses: 0,
					remaining: null,
				},
			],
			expenses,
		}
		const client = createApiClient({
			fetch: vi.fn<typeof globalThis.fetch>(async () => Response.json(overview)),
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const user = userEvent.setup()
		renderExpenseFlow(client, queryClient, "/expenses")
		await screen.findByText("昼食")

		// Act
		await user.click(screen.getByRole("button", { name: "未分類" }))

		// Assert
		expect(screen.getByText("その他")).toBeInTheDocument()
		expect(screen.queryByText("昼食")).not.toBeInTheDocument()
		expect(screen.getByRole("button", { name: "未分類" })).toHaveAttribute("aria-pressed", "true")
		expect(screen.queryByRole("button", { name: "日用品" })).not.toBeInTheDocument()
	})

	it("groups expenses from unavailable categories into one filter", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const expenses = [
			{
				id: "expense-hidden-one",
				date: "2026-10-05",
				amount: 500,
				categoryId: "00000000-0000-4000-8000-000000000091",
				memo: "旧費目の支出1",
				createdAt: "2026-10-05",
				updatedAt: "2026-10-05",
			},
			{
				id: "expense-hidden-two",
				date: "2026-10-04",
				amount: 300,
				categoryId: "00000000-0000-4000-8000-000000000092",
				memo: "旧費目の支出2",
				createdAt: "2026-10-04",
				updatedAt: "2026-10-04",
			},
		]
		const client = createApiClient({
			fetch: vi.fn<typeof globalThis.fetch>(async () =>
				Response.json({ ...EMPTY_OVERVIEW, expenses }),
			),
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const user = userEvent.setup()
		renderExpenseFlow(client, queryClient, "/expenses")
		await screen.findByText("旧費目の支出1")

		// Act
		await user.click(screen.getByRole("button", { name: "削除済みのカテゴリー" }))

		// Assert
		expect(screen.getByRole("button", { name: "削除済みのカテゴリー" })).toHaveAttribute(
			"aria-pressed",
			"true",
		)
		expect(screen.getByText("旧費目の支出1")).toBeInTheDocument()
		expect(screen.getByText("旧費目の支出2")).toBeInTheDocument()
		expect(screen.getByText("2件")).toBeInTheDocument()
	})

	it("allows cancelling deletion and refreshes the list after confirmation", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const expense = {
			id: "00000000-0000-4000-8000-000000000041",
			date: "2026-10-05",
			amount: 500,
			categoryId: null,
			memo: "昼食",
			createdAt: "2026-10-05",
			updatedAt: "2026-10-05",
		}
		let deleted = false
		const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
			if (init?.method === "DELETE") {
				deleted = true
				return new Response(null, { status: 204 })
			}
			return Response.json({ ...EMPTY_OVERVIEW, expenses: deleted ? [] : [expense] })
		})
		const client = createApiClient({
			fetch,
			getToken: async () => "session-token",
			networkErrorMessage: "通信エラー",
			invalidResponseMessage: "応答エラー",
		})
		const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
		const user = userEvent.setup()
		renderExpenseFlow(client, queryClient, "/expenses")
		await screen.findByText("昼食")

		// Act
		await user.click(screen.getByRole("link", { name: /昼食.*編集/ }))
		await screen.findByRole("heading", { name: "支出を編集" })
		await user.click(screen.getByRole("button", { name: "削除" }))
		expect(screen.getByText(/昼食.*2026年10月5日.*￥500/)).toBeInTheDocument()
		await user.click(screen.getByRole("button", { name: "キャンセル" }))
		expect(deleted).toBe(false)
		await user.click(screen.getByRole("button", { name: "削除" }))
		await user.click(screen.getByRole("button", { name: "削除" }))

		// Assert
		await waitFor(() => expect(screen.queryByText("昼食")).not.toBeInTheDocument())
		expect(fetch.mock.calls.filter(([, init]) => init?.method === "DELETE")).toHaveLength(1)
	})

	it("preserves an unavailable category when editing an expense from a past month", async () => {
		// Arrange
		vi.useFakeTimers({ toFake: ["Date"] })
		vi.setSystemTime(new Date("2026-10-05T00:00:00.000Z"))
		const expense = {
			id: "00000000-0000-4000-8000-000000000042",
			date: "2026-09-20",
			amount: 500,
			categoryId: "00000000-0000-4000-8000-000000000099",
			memo: "旧費目",
			createdAt: "2026-09-20",
			updatedAt: "2026-09-20",
		}
		const overview = { ...EMPTY_OVERVIEW, month: "2026-09-01", expenses: [expense] }
		const fetch = vi.fn<typeof globalThis.fetch>(async (_input, init) => {
			if (init?.method === "PATCH") return Response.json({ ...expense, memo: "修正" })
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
		const router = renderExpenseFlow(client, queryClient, "/expenses?month=2026-09")
		await screen.findByText("旧費目")

		// Act
		await user.click(screen.getByRole("link", { name: /旧費目.*編集/ }))
		await screen.findByRole("heading", { name: "支出を編集" })
		expect(screen.getByRole("combobox", { name: "カテゴリー" })).toHaveTextContent(
			"削除済みのカテゴリー",
		)
		await user.clear(screen.getByLabelText("メモ（任意）"))
		await user.type(screen.getByLabelText("メモ（任意）"), "修正")
		await user.click(screen.getByRole("button", { name: "変更を保存" }))

		// Assert
		await waitFor(() => expect(router.state.location.pathname).toBe("/expenses"))
		expect(router.state.location.search.month).toBe("2026-09")
		const patchCall = fetch.mock.calls.find(([, init]) => init?.method === "PATCH")
		expect(JSON.parse(String(patchCall?.[1]?.body))).toEqual({
			date: "2026-09-20",
			amount: 500,
			categoryId: expense.categoryId,
			memo: "修正",
		})
	})
})
