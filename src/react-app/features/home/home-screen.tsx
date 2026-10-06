import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { Button, buttonVariants } from "../../components/ui/button"
import { formatMonth, formatYen, getCurrentMonthStartInTokyo } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { getMonthlyOverviewQueryOptions } from "../monthly/api/monthly-overview"
import { ExpenseList } from "../monthly/components/expense-list"

export function HomeScreen() {
	const title = messages.home.title()
	const apiClient = useApiClient()
	const month = getCurrentMonthStartInTokyo()
	const query = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-md px-6 pb-28 pt-5">
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
						<section aria-labelledby="monthly-spending-heading">
							<p className="text-[0.8125rem] font-semibold text-[var(--budget-primary)]">
								{formatMonth(month)}
							</p>
							<h1
								id="monthly-spending-heading"
								className="app-text-muted mt-9 text-[0.8125rem] font-semibold"
							>
								{messages.home.spentLabel()}
							</h1>
							<p className="app-text-ink mt-2 text-[clamp(2.4rem,11vw,3.2rem)] leading-none font-semibold tracking-[-0.055em] tabular-nums">
								{formatYen(query.data.totals.expenses)}
							</p>
						</section>
						<Link
							to="/expenses/new"
							className={buttonVariants({
								variant: "secondary",
								className:
									"mt-9 h-14 w-full bg-[var(--budget-primary)]/12 text-[0.9375rem] font-semibold text-[var(--budget-primary)] hover:bg-[var(--budget-primary)]/20",
							})}
						>
							<Plus aria-hidden="true" />
							{messages.home.addExpense()}
						</Link>
						<section className="mt-18" aria-labelledby="expense-list-heading">
							<h2 id="expense-list-heading" className="app-text-ink text-lg font-semibold">
								{messages.home.recentExpensesTitle()}
							</h2>
							<ExpenseList
								overview={query.data}
								expenses={query.data.expenses.slice(0, 3)}
								label={messages.home.recentExpensesTitle()}
							/>
							<Link
								to="/expenses"
								className="app-text-ink mt-4 inline-flex min-h-11 items-center text-[0.8125rem] font-semibold"
							>
								{messages.home.allExpenses()}{" "}
								<span aria-hidden="true" className="ml-2">
									→
								</span>
							</Link>
						</section>
					</>
				) : null}
			</main>
		</>
	)
}
