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
		<div className="min-h-dvh bg-white">
			<a className="skip-link" href="#main-content">
				{messages.action.skipToContent()}
			</a>
			<header className="mx-auto flex min-h-20 max-w-md items-center px-6 pt-[env(safe-area-inset-top)]">
				<p className="text-base font-bold tracking-tight text-[var(--budget-primary)]">
					{messages.app.name()}
				</p>
			</header>
			<Outlet />
			{pathname !== "/expenses/new" ? <BottomNavigation /> : null}
		</div>
	)
}

export const Route = createFileRoute("/_app")({ component: AppLayout })
