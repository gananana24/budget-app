import { queryOptions } from "@tanstack/react-query"
import type { ApiClient } from "@/lib/api-client"

export type MonthlyCategory = Readonly<{
	id: string
	name: string
	iconName: string
	expenses: number
}>

export type MonthlyExpense = Readonly<{
	id: string
	date: string
	amount: number
	categoryId: string | null
	memo: string | null
	createdAt: string
	updatedAt: string
}>

export type MonthlyOverview = Readonly<{
	month: string
	totals: Readonly<{ expenses: number }>
	uncategorized: Readonly<{ expenses: number }>
	categories: readonly MonthlyCategory[]
	expenses: readonly MonthlyExpense[]
}>

export function monthlyOverviewQueryKey(month: string) {
	return ["monthly-overview", month] as const
}

export function getMonthlyOverviewQueryOptions(apiClient: ApiClient, month: string) {
	return queryOptions({
		queryKey: monthlyOverviewQueryKey(month),
		queryFn: ({ signal }) =>
			apiClient.get<MonthlyOverview>(`/api/months/${encodeURIComponent(month)}`, { signal }),
	})
}
