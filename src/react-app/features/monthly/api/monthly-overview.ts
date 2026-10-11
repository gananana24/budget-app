import { queryOptions } from "@tanstack/react-query"
import type { InferResponseType } from "hono/client"
import type { ApiClient } from "@/lib/api-client"

export type MonthlyOverview = InferResponseType<
	ApiClient["rpc"]["api"]["months"][":month"]["$get"],
	200
>
export type MonthlyCategory = MonthlyOverview["categories"][number]
export type MonthlyExpense = MonthlyOverview["expenses"][number]

export function monthlyOverviewQueryKey(month: string) {
	return ["monthly-overview", month] as const
}

export function getMonthlyOverviewQueryOptions(apiClient: ApiClient, month: string) {
	return queryOptions({
		queryKey: monthlyOverviewQueryKey(month),
		queryFn: async ({ signal }) => {
			const response = await apiClient.rpc.api.months[":month"].$get(
				{ param: { month: encodeURIComponent(month) } },
				{ init: { signal } },
			)
			return apiClient.unwrap(response)
		},
	})
}
