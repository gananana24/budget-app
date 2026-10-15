import { queryOptions } from "@tanstack/react-query"
import type { CategoriesResponse, CategoryResponse } from "../../../../shared/api/category"
import type { ApiClient } from "../../../lib/api-client"

export type Category = CategoryResponse

export const categoriesQueryKey = ["categories"] as const

export function getCategoriesQueryOptions(apiClient: ApiClient) {
	return queryOptions({
		queryKey: categoriesQueryKey,
		queryFn: async ({ signal }): Promise<CategoriesResponse> => {
			const response = await apiClient.rpc.api.categories.$get(undefined, { init: { signal } })
			return apiClient.unwrap<CategoriesResponse>(response)
		},
	})
}

export async function createCategory(apiClient: ApiClient, name: string, iconName: string) {
	const response = await apiClient.rpc.api.categories.$post({ json: { name, iconName } })
	return apiClient.unwrap(response)
}

export async function updateCategory(
	apiClient: ApiClient,
	id: string,
	name: string,
	iconName: string,
) {
	const response = await apiClient.rpc.api.categories[":categoryId"].$patch({
		param: { categoryId: encodeURIComponent(id) },
		json: { name, iconName },
	})
	return apiClient.unwrap(response)
}

export async function deleteCategory(apiClient: ApiClient, id: string) {
	const response = await apiClient.rpc.api.categories[":categoryId"].$delete({
		param: { categoryId: encodeURIComponent(id) },
	})
	await apiClient.unwrap(response)
}
