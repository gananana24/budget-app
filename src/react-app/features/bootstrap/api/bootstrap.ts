import { queryOptions } from "@tanstack/react-query"
import type { ApiClient } from "@/lib/api-client"

export async function bootstrap(apiClient: ApiClient): Promise<true> {
	const response = await apiClient.rpc.api.bootstrap.$post()
	await apiClient.unwrap(response)
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
