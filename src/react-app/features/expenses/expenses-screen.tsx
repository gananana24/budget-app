import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useState } from "react"
import { Screen } from "../../components/screen"
import { Button, buttonVariants } from "../../components/ui/button"
import { formatMonth, getCurrentMonthStartInTokyo, shiftMonth } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { getMonthlyOverviewQueryOptions } from "../monthly/api/monthly-overview"
import { ExpenseList } from "../monthly/components/expense-list"

const ALL_CATEGORIES = "all"
const UNCATEGORIZED = "uncategorized"

export function ExpensesScreen() {
	const title = messages.expenses.title()
	const apiClient = useApiClient()
	const [filter, setFilter] = useState(ALL_CATEGORIES)
	const navigate = useNavigate()
	const currentMonth = getCurrentMonthStartInTokyo()
	const selectedMonth = useRouterState({ select: (state) => state.location.search.month })
	const month = typeof selectedMonth === "string" ? `${selectedMonth}-01` : currentMonth
	const listLabel = messages.expenses.monthListTitle({ month: formatMonth(month) })
	const query = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))
	const presentCategoryIds = new Set(
		query.data?.expenses.flatMap((expense) => (expense.categoryId ? [expense.categoryId] : [])) ??
			[],
	)
	const listedCategoryIds = new Set(query.data?.categories.map((category) => category.id) ?? [])
	const filters = query.data
		? [
				{ id: ALL_CATEGORIES, label: messages.expenses.filterAll() },
				...(query.data.expenses.some((expense) => expense.categoryId === null)
					? [{ id: UNCATEGORIZED, label: messages.monthly.uncategorized() }]
					: []),
				...query.data.categories
					.filter((category) => presentCategoryIds.has(category.id))
					.map((category) => ({ id: category.id, label: category.name })),
				...[...presentCategoryIds]
					.filter((id) => !listedCategoryIds.has(id))
					.map((id) => ({ id, label: messages.expenses.hiddenCategory() })),
			]
		: []
	const activeFilter = filters.some((item) => item.id === filter) ? filter : ALL_CATEGORIES
	const filteredExpenses =
		query.data?.expenses.filter((expense) => {
			if (activeFilter === ALL_CATEGORIES) return true
			if (activeFilter === UNCATEGORIZED) return expense.categoryId === null
			return expense.categoryId === activeFilter
		}) ?? []

	function moveMonth(offset: number): void {
		setFilter(ALL_CATEGORIES)
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
						{query.data.expenses.length > 0 ? (
							<>
								<fieldset
									aria-label={messages.expenses.categoryLabel()}
									className="-mx-6 min-w-0 border-0 p-0"
								>
									<div className="flex gap-2 overflow-x-auto px-6 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
										{filters.map((item) => (
											<Button
												key={item.id}
												type="button"
												variant="outline"
												aria-pressed={activeFilter === item.id}
												className={
													activeFilter === item.id
														? "min-h-11 shrink-0 rounded-full border-[var(--budget-primary)]/30 bg-[var(--budget-primary)]/10 px-4 font-semibold text-[var(--budget-primary)] hover:bg-[var(--budget-primary)]/15"
														: "min-h-11 shrink-0 rounded-full border-border bg-background px-4 text-muted-foreground"
												}
												onClick={() => setFilter(item.id)}
											>
												{item.label}
											</Button>
										))}
									</div>
								</fieldset>
								<p className="app-text-muted mt-3 text-xs tabular-nums" aria-live="polite">
									{messages.expenses.resultCount({ count: filteredExpenses.length })}
								</p>
							</>
						) : null}
						{filteredExpenses.length === 0 && query.data.expenses.length > 0 ? (
							<div className="py-8 text-center">
								<p className="app-text-muted text-sm">{messages.expenses.filteredEmpty()}</p>
								<Button
									type="button"
									variant="ghost"
									className="mt-3 min-h-11 text-[var(--budget-primary)]"
									onClick={() => setFilter(ALL_CATEGORIES)}
								>
									{messages.expenses.clearFilter()}
								</Button>
							</div>
						) : (
							<ExpenseList
								overview={query.data}
								expenses={filteredExpenses}
								label={listLabel}
								editMonth={month.slice(0, 7)}
							/>
						)}
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
