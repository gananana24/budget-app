import type { ApiClient } from "../../../lib/api-client"
import type { CreateExpenseInput } from "./create-expense"

export async function updateExpense(apiClient: ApiClient, id: string, input: CreateExpenseInput) {
	const response = await apiClient.rpc.api.expenses[":expenseId"].$patch({
		param: { expenseId: encodeURIComponent(id) },
		json: input,
	})
	return apiClient.unwrap(response)
}

export async function deleteExpense(apiClient: ApiClient, id: string) {
	const response = await apiClient.rpc.api.expenses[":expenseId"].$delete({
		param: { expenseId: encodeURIComponent(id) },
	})
	await apiClient.unwrap(response)
}
