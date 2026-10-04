import { useQuery } from "@tanstack/react-query"
import type { ReactNode } from "react"
import { ErrorState, LoadingState } from "../../components/states"
import { messages } from "../../i18n/messages"
import { getBootstrapQueryOptions } from "./api/bootstrap"

type BootstrapGateProps = Readonly<{
	userId: string
	bootstrap: () => Promise<true>
	children: ReactNode
}>

export function BootstrapGate({ userId, bootstrap, children }: BootstrapGateProps) {
	const query = useQuery(getBootstrapQueryOptions({ userId, queryFn: bootstrap }))

	if (query.isPending) {
		return <LoadingState title={messages.bootstrap.loading()} />
	}

	if (query.isError) {
		return (
			<ErrorState
				title={messages.bootstrap.errorTitle()}
				description={
					query.error instanceof Error
						? query.error.message
						: messages.bootstrap.invalidResponseDescription()
				}
				onRetry={() => void query.refetch()}
				isRetrying={query.isFetching}
			/>
		)
	}

	return children
}
