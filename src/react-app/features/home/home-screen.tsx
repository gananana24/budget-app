import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Screen } from "../../components/screen"
import { formatYen, getCurrentMonthStartInTokyo } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { ExpenseList } from "../expenses/expense-list"
import { getMonthlyOverviewQueryOptions } from "../monthly/api/monthly-overview"

export function HomeScreen() {
	const title = messages.home.title()
	const apiClient = useApiClient()
	const month = getCurrentMonthStartInTokyo()
	const query = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen
				title={title}
				action={
					<Link
						to="/expenses"
						className="app-action-link inline-flex min-h-11 items-center rounded-lg px-4 text-sm font-medium"
					>
						{messages.home.addExpense()}
					</Link>
				}
			>
				{query.isPending ? (
					<p role="status" className="app-text-muted py-12 text-sm">
						{messages.monthly.loading()}
					</p>
				) : null}
				{query.isError ? (
					<div role="alert" className="py-8">
						<h2 className="app-text-ink text-lg font-semibold">{messages.monthly.errorTitle()}</h2>
						<p className="app-text-muted mt-2 text-sm">
							{query.error instanceof Error
								? query.error.message
								: messages.bootstrap.invalidResponseDescription()}
						</p>
						<button
							type="button"
							className="app-button mt-5 min-h-11 rounded-lg px-5 text-sm font-medium"
							onClick={() => void query.refetch()}
						>
							{messages.action.retry()}
						</button>
					</div>
				) : null}
				{query.data ? (
					<>
						<section aria-labelledby="monthly-spending-heading">
							<p id="monthly-spending-heading" className="app-text-muted text-sm font-medium">
								{messages.home.spentLabel()}
							</p>
							<p className="app-text-ink mt-2 text-4xl font-semibold tracking-tight tabular-nums">
								{formatYen(query.data.totals.expenses)}
							</p>
						</section>
						<section
							className="app-divider mt-10 border-t pt-6"
							aria-labelledby="expense-list-heading"
						>
							<h2 id="expense-list-heading" className="app-text-ink text-lg font-semibold">
								{messages.monthly.expenseListTitle()}
							</h2>
							<ExpenseList overview={query.data} />
						</section>
					</>
				) : null}
			</Screen>
		</>
	)
}
