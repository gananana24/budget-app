import { queryOptions } from "@tanstack/react-query"
import type { SubscriptionWrite, SubscriptionsResponse } from "../../../shared/api/subscription"
import type { ApiClient } from "../../lib/api-client"

export const subscriptionsQueryKey = ["subscriptions"] as const

export function subscriptionsQueryOptions(apiClient: ApiClient) {
	return queryOptions({
		queryKey: subscriptionsQueryKey,
		queryFn: async ({ signal }): Promise<SubscriptionsResponse> => {
			const response = await apiClient.rpc.api["subscriptions"].$get(undefined, {
				init: { signal },
			})
			return apiClient.unwrap<SubscriptionsResponse>(response)
		},
	})
}

export async function createSubscription(apiClient: ApiClient, values: SubscriptionWrite) {
	const response = await apiClient.rpc.api["subscriptions"].$post({ json: values })
	return apiClient.unwrap(response)
}

export async function updateSubscription(
	apiClient: ApiClient,
	id: string,
	values: SubscriptionWrite,
) {
	const response = await apiClient.rpc.api["subscriptions"][":subscriptionId"].$patch({
		param: { subscriptionId: id },
		json: values,
	})
	return apiClient.unwrap(response)
}

export async function endSubscription(apiClient: ApiClient, id: string) {
	const response = await apiClient.rpc.api["subscriptions"][":subscriptionId"].$delete({
		param: { subscriptionId: id },
	})
	await apiClient.unwrap(response)
}
