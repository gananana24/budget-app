import { jaJP } from "@clerk/localizations"
import { ClerkProvider } from "@clerk/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./index.css"
import "./App.css"
import { App } from "./app/app"

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
		<ClerkProvider publishableKey={clerkPublishableKey} localization={jaJP}>
			<App />
		</ClerkProvider>
	</StrictMode>,
)
