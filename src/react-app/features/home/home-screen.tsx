import { useQuery } from "@tanstack/react-query"
import { Screen } from "../../components/screen"
import { EmptyAddHint } from "../../components/empty-add-hint"
import { Button } from "../../components/ui/button"
import { formatMonth, getCurrentMonthStartInTokyo } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { AddExpenseAction } from "../expenses/add-expense-action"
import { getMonthlyOverviewQueryOptions } from "../monthly/api/monthly-overview"
import { MonthlyTotals } from "../monthly/components/monthly-totals"
import { CategoryShareChart } from "./category-share-chart"

export function HomeScreen() {
	const title = messages.home.title()
	const apiClient = useApiClient()
	const month = getCurrentMonthStartInTokyo()
	const query = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen title={title} primaryAction={<AddExpenseAction month={month} />}>
				<p className="app-text-muted text-sm tabular-nums">{formatMonth(month)}</p>
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
						<Button type="button" className="mt-5 min-h-11" onClick={() => void query.refetch()}>
							{messages.action.retry()}
						</Button>
					</div>
				) : null}
				{query.data ? (
					<>
						<MonthlyTotals overview={query.data} className="app-total-card mt-4 p-6" />
						{query.data.totals.expenses === 0 ? (
							<EmptyAddHint message={messages.expenses.emptyHint()} />
						) : null}
						{query.data.totals.expenses > 0 ? (
							<section aria-label={messages.home.categoriesTitle()}>
								<CategoryShareChart overview={query.data} />
							</section>
						) : null}
					</>
				) : null}
			</Screen>
		</>
	)
}
