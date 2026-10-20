import { Link } from "@tanstack/react-router"
import { Home, PiggyBank, Repeat2, Settings } from "lucide-react"
import type { ComponentType, SVGProps } from "react"
import { messages } from "../i18n/messages"

type NavigationItem = Readonly<{
	to: "/" | "/expenses" | "/subscriptions" | "/settings"
	label: string
	icon: ComponentType<SVGProps<SVGSVGElement>>
}>

const navigationItems: readonly NavigationItem[] = [
	{ to: "/", label: messages.navigation.home(), icon: Home },
	{ to: "/expenses", label: messages.navigation.expenses(), icon: PiggyBank },
	{ to: "/subscriptions", label: messages.navigation.subscription(), icon: Repeat2 },
	{ to: "/settings", label: messages.navigation.settings(), icon: Settings },
]

export function BottomNavigation() {
	return (
		<nav
			className="bottom-navigation app-divider z-10 shrink-0 border-t bg-white/95 backdrop-blur-lg"
			aria-label={messages.navigation.label()}
		>
			<ul className="mx-auto grid max-w-md grid-cols-4 px-2">
				{navigationItems.map(({ to, label, icon: Icon }) => (
					<li key={to}>
						<Link
							to={to}
							activeOptions={{ exact: to === "/" }}
							className="app-navigation-link app-text-muted flex min-h-16 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium select-none focus-visible:outline-2 focus-visible:outline-offset-[-2px]"
							activeProps={{ className: "app-navigation-active" }}
						>
							<span className="app-navigation-icon flex size-9 items-center justify-center rounded-full">
								<Icon aria-hidden="true" className="size-5" strokeWidth={1.8} />
							</span>
							<span>{label}</span>
						</Link>
					</li>
				))}
			</ul>
		</nav>
	)
}
