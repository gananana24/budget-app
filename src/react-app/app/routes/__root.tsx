import { createRootRoute, type ErrorComponentProps, Link, Outlet } from "@tanstack/react-router"
import { ErrorState } from "../../components/states"
import { formatDocumentTitle, messages } from "../../i18n/messages"

function NotFoundScreen() {
	const title = messages.route.notFoundTitle()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<ErrorState
				title={title}
				description={messages.route.notFoundDescription()}
				action={
					<Link
						to="/"
						className="app-action-link inline-flex min-h-11 items-center rounded-lg px-5 py-2.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2"
					>
						{messages.action.backToHome()}
					</Link>
				}
			/>
		</>
	)
}

function RouteErrorScreen({ reset }: ErrorComponentProps) {
	const title = messages.route.errorTitle()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<ErrorState title={title} description={messages.route.errorDescription()} onRetry={reset} />
		</>
	)
}

export const Route = createRootRoute({
	component: Outlet,
	notFoundComponent: NotFoundScreen,
	errorComponent: RouteErrorScreen,
})
