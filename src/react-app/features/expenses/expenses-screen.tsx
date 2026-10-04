import { Screen } from "../../components/screen"
import { EmptyState } from "../../components/states"
import { formatDocumentTitle, messages } from "../../i18n/messages"

export function ExpensesScreen() {
	const title = messages.expenses.title()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen title={title}>
				<EmptyState
					title={messages.expenses.emptyTitle()}
					description={messages.expenses.emptyDescription()}
				/>
			</Screen>
		</>
	)
}
