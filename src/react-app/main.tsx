import { enUS, esES, jaJP } from "@clerk/localizations"
import { ClerkProvider } from "@clerk/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "./App.css"
import { App } from "./app/app"
import { messages } from "./i18n/messages"
import { getLocale } from "./paraglide/runtime.js"

const locale = getLocale()
const clerkLocalization = locale === "ja" ? jaJP : locale === "es" ? esES : enUS
document.documentElement.lang = locale
if (locale !== "ja") {
	document
		.querySelector('link[rel="manifest"]')
		?.setAttribute("href", `/manifest.${locale}.webmanifest`)
	document
		.querySelector('meta[name="apple-mobile-web-app-title"]')
		?.setAttribute("content", locale === "en" ? "Budget" : "Presupuesto")
	document.title = locale === "en" ? "Budget" : "Presupuesto"
}

const root = document.getElementById("root")
if (!root) {
	throw new Error("Root element was not found")
}

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY
if (!clerkPublishableKey) {
	throw new Error("Clerk publishable key is not configured")
}

createRoot(root).render(
	<StrictMode>
		<ClerkProvider
			publishableKey={clerkPublishableKey}
			localization={{
				...clerkLocalization,
				signIn: {
					...clerkLocalization.signIn,
					start: {
						...clerkLocalization.signIn?.start,
						title: messages.auth.signInActionTitle(),
						subtitle: "",
					},
				},
			}}
			appearance={{
				variables: {
					colorPrimary: "#27814e",
					colorPrimaryForeground: "#ffffff",
					colorForeground: "#2b312d",
					colorMutedForeground: "#68706b",
					colorBackground: "#ffffff",
					colorInput: "#ffffff",
					colorBorder: "#e5e9e5",
					colorRing: "#27814e",
					borderRadius: "0.75rem",
					fontFamily:
						'"Poppins", "Noto Sans JP Variable", "Hiragino Kaku Gothic ProN", "Yu Gothic", sans-serif',
					fontSize: "0.875rem",
				},
			}}
		>
			<App />
		</ClerkProvider>
	</StrictMode>,
)
