import { createContext, type ReactNode, useContext } from "react"
import type { ApiClient } from "./api-client"

const ApiClientContext = createContext<ApiClient | null>(null)

type ApiClientProviderProps = Readonly<{
	client: ApiClient
	children: ReactNode
}>

export function ApiClientProvider({ client, children }: ApiClientProviderProps) {
	return <ApiClientContext value={client}>{children}</ApiClientContext>
}

export function useApiClient(): ApiClient {
	const client = useContext(ApiClientContext)
	if (!client) {
		throw new Error("ApiClientProvider is required")
	}

	return client
}
