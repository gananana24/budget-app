import { Link } from "@tanstack/react-router"
import { CircleDollarSign, Home, Settings } from "lucide-react"
import type { ComponentType, SVGProps } from "react"
import { messages } from "../i18n/messages"

type NavigationItem = Readonly<{
	to: "/" | "/expenses" | "/settings"
	label: string
	icon: ComponentType<SVGProps<SVGSVGElement>>
}>

const navigationItems: readonly NavigationItem[] = [
	{ to: "/", label: messages.navigation.home(), icon: Home },
	{ to: "/expenses", label: messages.navigation.expenses(), icon: CircleDollarSign },
	{ to: "/settings", label: messages.navigation.settings(), icon: Settings },
]

export function BottomNavigation() {
	return (
		<nav
			className="bottom-navigation app-divider fixed inset-x-0 bottom-0 z-10 border-t bg-white pb-[env(safe-area-inset-bottom)]"
			aria-label={messages.navigation.label()}
		>
			<ul className="mx-auto grid max-w-md grid-cols-3 px-2">
				{navigationItems.map(({ to, label, icon: Icon }) => (
					<li key={to}>
						<Link
							to={to}
							activeOptions={{ exact: to === "/" }}
							className="app-navigation-link app-text-muted flex min-h-16 flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
							activeProps={{ className: "app-navigation-active" }}
						>
							<Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
							<span>{label}</span>
						</Link>
					</li>
				))}
			</ul>
		</nav>
	)
}
