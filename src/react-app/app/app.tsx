import { SignIn, useAuth } from "@clerk/react"
import { QueryClientProvider } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { LoadingState } from "../components/states"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../components/ui/select"
import { bootstrap } from "../features/bootstrap/api/bootstrap"
import { BootstrapGate } from "../features/bootstrap/bootstrap-gate"
import { languageName, messages } from "../i18n/messages"
import { createApiClient } from "../lib/api-client"
import { ApiClientProvider } from "../lib/api-client-context"
import { getLocale, setLocale } from "../paraglide/runtime.js"
import { AppRouter } from "./app-router"
import { createAppQueryClient } from "./query-client"

function SignInScreen() {
	return (
		<main className="mx-auto flex min-h-dvh w-full max-w-md flex-col bg-background px-6 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))]">
			<div className="flex flex-1 flex-col justify-center gap-8">
				<header className="text-center">
					<h1 className="app-text-ink text-2xl font-semibold tracking-tight">
						{messages.auth.signInHeading()}
					</h1>
					<p className="app-text-muted mt-3 text-sm leading-6">
						{messages.auth.signInDescription()}
					</p>
				</header>
				<SignIn
					routing="hash"
					appearance={{
						options: { elevation: "flush" },
						variables: { colorBackground: "#f8faf7" },
						elements: {
							rootBox: { width: "100%" },
							cardBox: { width: "100%" },
							header: { alignItems: "center", textAlign: "center" },
							headerTitle: { fontSize: "1.125rem", fontWeight: 600 },
							formFieldInput: { minHeight: "3rem", backgroundColor: "#ffffff" },
							formButtonPrimary: { minHeight: "3rem" },
							socialButtonsBlockButton: { minHeight: "3rem", backgroundColor: "#ffffff" },
							footerAction: { flexDirection: "column", alignItems: "center", gap: "0.25rem" },
						},
					}}
				/>
			</div>
			<div className="app-divider mt-8 flex items-center justify-between gap-4 border-t pt-5 text-sm">
				<span id="sign-in-language" className="app-text-muted">
					{messages.settings.languageLabel()}
				</span>
				<Select
					value={getLocale()}
					onValueChange={(value) => {
						if (value === "ja" || value === "en" || value === "es") setLocale(value)
					}}
				>
					<SelectTrigger
						aria-labelledby="sign-in-language"
						className="min-h-12 min-w-32 rounded-xl border-input bg-white px-4 text-sm"
					>
						<SelectValue>{languageName}</SelectValue>
					</SelectTrigger>
					<SelectContent className="p-1.5">
						<SelectItem value="ja" className="min-h-12 px-3 pr-10">
							{messages.settings.languageJapanese()}
						</SelectItem>
						<SelectItem value="en" className="min-h-12 px-3 pr-10">
							{messages.settings.languageEnglish()}
						</SelectItem>
						<SelectItem value="es" className="min-h-12 px-3 pr-10">
							{messages.settings.languageSpanish()}
						</SelectItem>
					</SelectContent>
				</Select>
			</div>
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
