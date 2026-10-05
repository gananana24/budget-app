import { Screen } from "../../components/screen"
import { EmptyState } from "../../components/states"
import { formatDocumentTitle, messages } from "../../i18n/messages"

export function BudgetScreen() {
	const title = messages.budget.title()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen title={title}>
				<EmptyState
					title={messages.budget.emptyTitle()}
					description={messages.budget.emptyDescription()}
				/>
			</Screen>
		</>
	)
}
