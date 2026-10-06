import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { Screen } from "../../components/screen"
import { Button, buttonVariants } from "../../components/ui/button"
import { formatMonth, getCurrentMonthStartInTokyo, shiftMonth } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { getMonthlyOverviewQueryOptions } from "../monthly/api/monthly-overview"
import { ExpenseList } from "../monthly/components/expense-list"

export function ExpensesScreen() {
	const title = messages.expenses.title()
	const apiClient = useApiClient()
	const navigate = useNavigate()
	const currentMonth = getCurrentMonthStartInTokyo()
	const selectedMonth = useRouterState({ select: (state) => state.location.search.month })
	const month = typeof selectedMonth === "string" ? `${selectedMonth}-01` : currentMonth
	const listLabel = messages.expenses.monthListTitle({ month: formatMonth(month) })
	const query = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))

	function moveMonth(offset: number): void {
		void navigate({ to: "/expenses", search: { month: shiftMonth(month, offset).slice(0, 7) } })
	}

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen
				title={title}
				action={
					<Link
						to="/expenses/new"
						search={{ month: month.slice(0, 7) }}
						className={buttonVariants({
							variant: "ghost",
							size: "lg",
							className: "min-h-11 text-[var(--budget-primary)]",
						})}
					>
						<Plus aria-hidden="true" />
						{messages.expenses.add()}
					</Link>
				}
			>
				<div className="flex items-center justify-between gap-4">
					<Button
						type="button"
						variant="ghost"
						size="icon-lg"
						aria-label={messages.expenses.previousMonth()}
						className="min-h-11 min-w-11"
						onClick={() => moveMonth(-1)}
					>
						<ChevronLeft aria-hidden="true" />
					</Button>
					<p aria-live="polite" className="app-text-ink text-base font-semibold tabular-nums">
						{formatMonth(month)}
					</p>
					<Button
						type="button"
						variant="ghost"
						size="icon-lg"
						aria-label={messages.expenses.nextMonth()}
						disabled={month >= currentMonth}
						className="min-h-11 min-w-11"
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
					<section className="mt-8" aria-label={listLabel}>
						<ExpenseList overview={query.data} label={listLabel} />
						{query.data.expenses.length === 0 ? (
							<Link
								to="/expenses/new"
								search={{ month: month.slice(0, 7) }}
								className={buttonVariants({
									variant: "secondary",
									className:
										"mt-2 h-12 w-full bg-[var(--budget-primary)]/12 font-semibold text-[var(--budget-primary)] hover:bg-[var(--budget-primary)]/20",
								})}
							>
								<Plus aria-hidden="true" />
								{messages.home.addExpense()}
							</Link>
						) : null}
					</section>
				) : null}
			</Screen>
		</>
	)
}
