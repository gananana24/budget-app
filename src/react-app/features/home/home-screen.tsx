import { Screen } from "../../components/screen"
import { EmptyState } from "../../components/states"
import { formatDocumentTitle, messages } from "../../i18n/messages"

export function HomeScreen() {
	const title = messages.home.title()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen title={title}>
				<section aria-labelledby="monthly-spending-heading">
					<p id="monthly-spending-heading" className="app-text-muted text-sm font-medium">
						{messages.home.spentLabel()}
					</p>
					<p className="app-text-ink mt-2 text-4xl font-semibold tracking-tight">
						<span aria-hidden="true">—</span>
						<span className="sr-only">{messages.home.uncalculated()}</span>
					</p>
				</section>
				<div className="app-divider mt-10 border-t">
					<EmptyState
						title={messages.home.emptyTitle()}
						description={messages.home.emptyDescription()}
					/>
				</div>
			</Screen>
		</>
	)
}
