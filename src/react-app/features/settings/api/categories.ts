import { queryOptions } from "@tanstack/react-query"
import type { ApiClient } from "../../../lib/api-client"

export type Category = Readonly<{ id: string; name: string; iconName: string; isInitial: boolean }>

export const categoriesQueryKey = ["categories"] as const

export function getCategoriesQueryOptions(apiClient: ApiClient) {
	return queryOptions({
		queryKey: categoriesQueryKey,
		queryFn: ({ signal }) =>
			apiClient.get<{ categories: readonly Category[] }>("/api/categories", { signal }),
	})
}

export function createCategory(apiClient: ApiClient, name: string, iconName: string) {
	return apiClient.post<Category>("/api/categories", { name, iconName })
}

export function updateCategory(apiClient: ApiClient, id: string, name: string, iconName: string) {
	return apiClient.patch<Category>(`/api/categories/${encodeURIComponent(id)}`, { name, iconName })
}

export function deleteCategory(apiClient: ApiClient, id: string) {
	return apiClient.delete(`/api/categories/${encodeURIComponent(id)}`)
}
