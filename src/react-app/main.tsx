import { enUS, jaJP } from "@clerk/localizations"
import { ClerkProvider } from "@clerk/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "./App.css"
import { App } from "./app/app"
import { getLocale } from "./paraglide/runtime.js"

const locale = getLocale()
document.documentElement.lang = locale
if (locale === "en") {
	document.querySelector('link[rel="manifest"]')?.setAttribute("href", "/manifest.en.webmanifest")
	document
		.querySelector('meta[name="apple-mobile-web-app-title"]')
		?.setAttribute("content", "Budget")
	document.title = "Budget"
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
		localization={locale === "ja" ? jaJP : enUS}
		>
			<App />
		</ClerkProvider>
	</StrictMode>,
)
