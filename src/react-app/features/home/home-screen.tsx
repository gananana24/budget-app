import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Button, buttonVariants } from "../../components/ui/button"
import { formatMonth, formatYen, getCurrentMonthStartInTokyo, shiftMonth } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import {
	getMonthlyOverviewQueryOptions,
	type MonthlyCategory,
} from "../monthly/api/monthly-overview"
import { ExpenseList } from "../monthly/components/expense-list"

function CategoryStatus({ category }: Readonly<{ category: MonthlyCategory }>) {
	const isUnset = category.budget.status === "unset"
	const isOver = category.remaining !== null && category.remaining < 0

	return (
		<li className="border-b border-border py-4 last:border-b-0">
			<div className="flex items-start justify-between gap-4">
				<h3 className="app-text-ink min-w-0 text-sm font-semibold">{category.name}</h3>
				<span className="app-text-ink shrink-0 text-sm font-semibold tabular-nums">
					{messages.home.categorySpent({ amount: formatYen(category.expenses) })}
				</span>
			</div>
			<div className="app-text-muted mt-2 flex flex-wrap justify-between gap-x-4 gap-y-1 text-xs tabular-nums">
				<p>
					{isUnset
						? messages.home.budgetUnset()
						: messages.home.categoryBudget({ amount: formatYen(category.budget.amount) })}
				</p>
				{!isUnset ? (
					<p className={isOver ? "font-semibold text-destructive" : undefined}>
						{isOver ? `${messages.home.overBudget()} · ` : ""}
						{messages.home.categoryRemaining({ amount: formatYen(category.remaining ?? 0) })}
					</p>
				) : null}
			</div>
		</li>
	)
}

export function HomeScreen() {
	const title = messages.home.title()
	const apiClient = useApiClient()
	const navigate = useNavigate()
	const currentMonth = getCurrentMonthStartInTokyo()
	const selectedMonth = useRouterState({ select: (state) => state.location.search.month })
	const month = typeof selectedMonth === "string" ? `${selectedMonth}-01` : currentMonth
	const query = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))
	const hasBudget =
		query.data?.categories.some((category) => category.budget.status === "set") ?? false
	const isOver = hasBudget && (query.data?.totals.remaining ?? 0) < 0

	function moveMonth(offset: number): void {
		void navigate({ to: "/", search: { month: shiftMonth(month, offset).slice(0, 7) } })
	}

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-md px-6 pb-28 pt-5">
				<div className="flex items-center justify-between gap-3">
					<Button
						type="button"
						variant="ghost"
						size="icon-lg"
						className="min-h-11 min-w-11"
						aria-label={messages.expenses.previousMonth()}
						onClick={() => moveMonth(-1)}
					>
						<ChevronLeft aria-hidden="true" />
					</Button>
					<h1 className="app-text-ink text-base font-semibold tabular-nums" aria-live="polite">
						{formatMonth(month)}
					</h1>
					<Button
						type="button"
						variant="ghost"
						size="icon-lg"
						className="min-h-11 min-w-11"
						aria-label={messages.expenses.nextMonth()}
						disabled={month >= currentMonth}
						onClick={() => moveMonth(1)}
					>
						<ChevronRight aria-hidden="true" />
					</Button>
				</div>
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
						<section
							className="mt-7 rounded-2xl bg-[var(--budget-primary)]/7 p-5"
							aria-label={messages.home.title()}
						>
							<p className="app-text-muted text-sm font-semibold">{messages.home.spentLabel()}</p>
							<p className="app-text-ink mt-2 break-all text-[clamp(2rem,9vw,2.8rem)] leading-tight font-semibold tracking-tight tabular-nums">
								{formatYen(query.data.totals.expenses)}
							</p>
							<div className="mt-5 grid grid-cols-2 gap-4 border-t border-[var(--budget-primary)]/15 pt-4">
								<div>
									<p className="app-text-muted text-xs">{messages.home.budgetLabel()}</p>
									<p className="app-text-ink mt-1 text-sm font-semibold tabular-nums">
										{hasBudget ? formatYen(query.data.totals.budget) : messages.home.budgetUnset()}
									</p>
								</div>
								<div>
									<p className="app-text-muted text-xs">{messages.home.remainingLabel()}</p>
									<p
										className={`mt-1 text-sm font-semibold tabular-nums ${isOver ? "text-destructive" : "app-text-ink"}`}
									>
										{hasBudget
											? formatYen(query.data.totals.remaining)
											: messages.home.budgetUnset()}
									</p>
									{isOver ? (
										<p className="mt-1 text-xs font-semibold text-destructive">
											{messages.home.overBudget()}
										</p>
									) : null}
								</div>
							</div>
						</section>
						<Link
							to="/expenses/new"
							search={{ month: month.slice(0, 7) }}
							className={buttonVariants({
								variant: "secondary",
								className:
									"mt-6 h-14 w-full bg-[var(--budget-primary)]/12 text-[0.9375rem] font-semibold text-[var(--budget-primary)] hover:bg-[var(--budget-primary)]/20",
							})}
						>
							<Plus aria-hidden="true" />
							{messages.home.addExpense()}
						</Link>
						<section className="mt-10" aria-labelledby="categories-heading">
							<h2 id="categories-heading" className="app-text-ink text-lg font-semibold">
								{messages.home.categoriesTitle()}
							</h2>
							<ul className="mt-2">
								{query.data.categories.map((category) => (
									<CategoryStatus key={category.id} category={category} />
								))}
							</ul>
							<div className="border-t border-border py-4">
								<p className="app-text-ink text-sm font-semibold">
									{messages.home.uncategorizedSpent({
										amount: formatYen(query.data.uncategorized.expenses),
									})}
								</p>
							</div>
						</section>
						<section className="mt-8" aria-labelledby="expense-list-heading">
							<h2 id="expense-list-heading" className="app-text-ink text-lg font-semibold">
								{messages.home.recentExpensesForMonth()}
							</h2>
							<ExpenseList
								overview={query.data}
								expenses={query.data.expenses.slice(0, 3)}
								label={messages.home.recentExpensesForMonth()}
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
					</>
				) : null}
			</main>
		</>
	)
}
