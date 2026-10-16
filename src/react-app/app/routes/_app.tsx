import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router"
import { useEffect } from "react"
import { BottomNavigation } from "../../components/bottom-navigation"
import { messages } from "../../i18n/messages"

function AppLayout() {
	const pathname = useRouterState({ select: (state) => state.location.pathname })
	const isExpenseForm = pathname === "/expenses/new" || /^\/expenses\/[^/]+\/edit$/.test(pathname)

	// pathname intentionally retriggers focus after client-side navigation.
	useEffect(() => {
		document.getElementById("main-content")?.focus({ preventScroll: true })
	}, [pathname])

	return (
		<div className="flex h-dvh flex-col overflow-hidden bg-background pt-[env(safe-area-inset-top)]">
			<a className="skip-link" href="#main-content">
				{messages.action.skipToContent()}
			</a>
			<div id="app-scroll-region" className="min-h-0 flex-1 overflow-y-auto overscroll-y-contain">
				<Outlet />
			</div>
			{isExpenseForm ? null : <BottomNavigation />}
		</div>
	)
}

export const Route = createFileRoute("/_app")({ component: AppLayout })
