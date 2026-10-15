import { queryOptions } from "@tanstack/react-query"
import type { ApiClient } from "@/lib/api-client"
import type { MonthlyOverviewResponse } from "../../../../shared/api/monthly-overview"

export type MonthlyOverview = MonthlyOverviewResponse
export type MonthlyCategory = MonthlyOverview["categories"][number]
export type MonthlyExpense = MonthlyOverview["expenses"][number]

export function monthlyOverviewQueryKey(month: string) {
	return ["monthly-overview", month] as const
}

export function getMonthlyOverviewQueryOptions(apiClient: ApiClient, month: string) {
	return queryOptions({
		queryKey: monthlyOverviewQueryKey(month),
		queryFn: async ({ signal }): Promise<MonthlyOverview> => {
			const response = await apiClient.rpc.api.months[":month"].$get(
				{ param: { month: encodeURIComponent(month) } },
				{ init: { signal } },
			)
			return apiClient.unwrap<MonthlyOverview>(response)
		},
	})
}
