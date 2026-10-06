import type { ApiClient } from "@/lib/api-client"

export type CreateExpenseInput = Readonly<{
	date: string
	amount: number
	categoryId: string | null
	memo: string | null
}>

export type CreatedExpense = Readonly<{
	id: string
	date: string
	amount: number
	categoryId: string | null
	memo: string | null
}>

export function createExpense(apiClient: ApiClient, input: CreateExpenseInput) {
	return apiClient.post<CreatedExpense>("/api/expenses", input)
}
