import { queryOptions } from "@tanstack/react-query"
import type { ApiClient } from "../../../lib/api-client"

export type BudgetDraft = Readonly<{
	month: string
	initialized: boolean
	budgets: readonly Readonly<{ categoryId: string; amount: number }>[]
}>

export function budgetDraftQueryKey(month: string) {
	return ["budget-draft", month] as const
}

export function getBudgetDraftQueryOptions(apiClient: ApiClient, month: string) {
	return queryOptions({
		queryKey: budgetDraftQueryKey(month),
		queryFn: ({ signal }) =>
			apiClient.get<BudgetDraft>(`/api/months/${encodeURIComponent(month)}/budget-draft`, {
				signal,
			}),
	})
}

export function saveBudgets(
	apiClient: ApiClient,
	month: string,
	budgets: readonly Readonly<{ categoryId: string; amount: number }>[],
) {
	return apiClient.put<BudgetDraft>(`/api/months/${encodeURIComponent(month)}/budgets`, {
		budgets,
	})
}

export function deleteBudget(apiClient: ApiClient, month: string, categoryId: string) {
	return apiClient.delete(
		`/api/months/${encodeURIComponent(month)}/budgets/${encodeURIComponent(categoryId)}`,
	)
}
