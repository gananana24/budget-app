import type { InferResponseType } from "hono/client"
import type { ApiClient } from "@/lib/api-client"
import type { CreateExpenseRequest } from "../../../../shared/api/create-expense"

export type CreateExpenseInput = CreateExpenseRequest
export type CreatedExpense = InferResponseType<ApiClient["rpc"]["api"]["expenses"]["$post"], 201>

export async function createExpense(apiClient: ApiClient, input: CreateExpenseInput) {
	const response = await apiClient.rpc.api.expenses.$post({ json: input })
	return apiClient.unwrap(response)
}
