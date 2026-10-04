import { queryOptions } from "@tanstack/react-query"
import type { ApiClient } from "@/lib/api-client"

export async function bootstrap(apiClient: ApiClient): Promise<true> {
	await apiClient.post<void>("/api/bootstrap")
	return true
}

type BootstrapQueryOptions = Readonly<{
	userId: string
	queryFn: () => Promise<true>
}>

export function getBootstrapQueryOptions({ userId, queryFn }: BootstrapQueryOptions) {
	return queryOptions({
		queryKey: ["bootstrap", userId] as const,
		queryFn,
		staleTime: Number.POSITIVE_INFINITY,
		retry: false,
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		refetchOnReconnect: false,
	})
}
