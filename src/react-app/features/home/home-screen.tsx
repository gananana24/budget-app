import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Plus } from "lucide-react"
import { Button, buttonVariants } from "../../components/ui/button"
import { formatMonth, getCurrentMonthStartInTokyo } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { getMonthlyOverviewQueryOptions } from "../monthly/api/monthly-overview"
import { CategoryBreakdown } from "../monthly/components/category-breakdown"
import { ExpenseList } from "../monthly/components/expense-list"
import { MonthlyTotals } from "../monthly/components/monthly-totals"

export function HomeScreen() {
	const title = messages.home.title()
	const apiClient = useApiClient()
	const month = getCurrentMonthStartInTokyo()
	const query = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-md px-6 pb-28 pt-5">
				<header>
					<h1 className="app-text-ink text-2xl font-semibold tracking-tight">{title}</h1>
					<p className="app-text-muted mt-2 text-sm tabular-nums">{formatMonth(month)}</p>
				</header>
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
						<MonthlyTotals
							overview={query.data}
							className="mt-7 rounded-[1.4rem] bg-[var(--budget-primary-soft)] p-5"
						/>
						<Link
							to="/expenses/new"
							search={{ month: month.slice(0, 7) }}
							className={buttonVariants({
								variant: "ghost",
								className:
									"app-primary-action mt-6 h-14 w-full rounded-xl text-[0.9375rem] font-semibold",
							})}
						>
							<Plus aria-hidden="true" />
							{messages.home.addExpense()}
						</Link>
						<section className="mt-9" aria-labelledby="expense-list-heading">
							<h2 id="expense-list-heading" className="app-text-ink text-lg font-semibold">
								{messages.home.recentExpensesForMonth()}
							</h2>
							<ExpenseList
								overview={query.data}
								expenses={query.data.expenses.slice(0, 3)}
								label={messages.home.recentExpensesForMonth()}
								editMonth={month.slice(0, 7)}
							/>
							<Link
								to="/expenses"
								search={{ month: month.slice(0, 7) }}
								className="app-text-ink mt-4 inline-flex min-h-11 items-center text-[0.8125rem] font-semibold"
							>
								{messages.home.allExpenses()}{" "}
								<span aria-hidden="true" className="ml-2">
									→
								</span>
							</Link>
						</section>
						{query.data.totals.expenses > 0 ? (
							<section className="mt-10" aria-labelledby="categories-heading">
								<div className="flex items-center justify-between gap-3">
									<h2 id="categories-heading" className="app-text-ink text-lg font-semibold">
										{messages.home.categoriesTitle()}
									</h2>
								</div>
								<CategoryBreakdown overview={query.data} preview />
								<Link
									to="/expenses"
									search={{ month: month.slice(0, 7) }}
									hash="categories"
									className="app-text-ink mt-2 inline-flex min-h-11 items-center text-[0.8125rem] font-semibold"
								>
									{messages.home.allCategories()}{" "}
									<span aria-hidden="true" className="ml-2">
										→
									</span>
								</Link>
							</section>
						) : null}
					</>
				) : null}
			</main>
		</>
	)
}
