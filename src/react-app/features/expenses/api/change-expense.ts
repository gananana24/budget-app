import type { ApiClient } from "../../../lib/api-client"
import type { CreatedExpense, CreateExpenseInput } from "./create-expense"

export function updateExpense(apiClient: ApiClient, id: string, input: CreateExpenseInput) {
	return apiClient.patch<CreatedExpense>(`/api/expenses/${encodeURIComponent(id)}`, input)
}

export function deleteExpense(apiClient: ApiClient, id: string) {
	return apiClient.delete(`/api/expenses/${encodeURIComponent(id)}`)
}
