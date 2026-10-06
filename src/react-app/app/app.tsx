import { SignIn, useAuth } from "@clerk/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { LoadingState } from "../components/states"
import { bootstrap } from "../features/bootstrap/api/bootstrap"
import { BootstrapGate } from "../features/bootstrap/bootstrap-gate"
import { messages } from "../i18n/messages"
import { createApiClient } from "../lib/api-client"
import { ApiClientProvider } from "../lib/api-client-context"
import { AppRouter } from "./app-router"
import { createAppQueryClient } from "./query-client"

function SignInScreen() {
	return (
		<main className="mx-auto grid min-h-dvh w-full max-w-md content-center justify-items-center gap-8 bg-white px-6 py-8">
			<header className="max-w-sm text-center">
				<h1 className="app-text-ink text-3xl font-semibold tracking-tight">
					{messages.auth.signInHeading()}
				</h1>
				<p className="app-text-muted mt-3 text-sm leading-6">{messages.auth.signInDescription()}</p>
			</header>
			<SignIn routing="hash" />
		</main>
	)
}

type AuthenticatedSessionProps = Readonly<{
	userId: string
	getToken: () => Promise<string | null>
}>

function AuthenticatedSession({ userId, getToken }: AuthenticatedSessionProps) {
	const [queryClient] = useState(createAppQueryClient)
	const apiClient = useMemo(
		() =>
			createApiClient({
				getToken,
				networkErrorMessage: messages.bootstrap.networkErrorDescription(),
				invalidResponseMessage: messages.bootstrap.invalidResponseDescription(),
			}),
		[getToken],
	)

	return (
		<QueryClientProvider client={queryClient}>
			<ApiClientProvider client={apiClient}>
				<BootstrapGate userId={userId} bootstrap={() => bootstrap(apiClient)}>
					<AppRouter />
				</BootstrapGate>
			</ApiClientProvider>
		</QueryClientProvider>
	)
}

export function App() {
	const { isLoaded, isSignedIn, userId, getToken } = useAuth()

	if (!isLoaded) {
		return <LoadingState title={messages.auth.loading()} />
	}

	if (!isSignedIn || !userId) {
		return <SignInScreen />
	}

	return <AuthenticatedSession key={userId} userId={userId} getToken={getToken} />
}
