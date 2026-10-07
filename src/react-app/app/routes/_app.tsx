import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"
import { BottomNavigation } from "../../components/bottom-navigation"
import { messages } from "../../i18n/messages"

function AppLayout() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })

	// biome-ignore lint/correctness/useExhaustiveDependencies: pathname intentionally retriggers focus after client-side navigation.
	useEffect(() => {
		document.getElementById("main-content")?.focus()
	}, [pathname])

	return (
		<div className="min-h-dvh bg-[#faf9f6] pt-[env(safe-area-inset-top)]">
			<a className="skip-link" href="#main-content">
				{messages.action.skipToContent()}
			</a>
			<Outlet />
			{pathname !== "/expenses/new" ? <BottomNavigation /> : null}
		</div>
	)
}

export const Route = createFileRoute("/_app")({ component: AppLayout })
