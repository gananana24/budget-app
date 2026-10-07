import { useQuery } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, Plus } from "lucide-react"
import { useState } from "react"
import { Button, buttonVariants } from "../../components/ui/button"
import { formatMonth, formatYen, getCurrentMonthStartInTokyo, shiftMonth } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { getMonthlyOverviewQueryOptions } from "../monthly/api/monthly-overview"
import { CategoryBreakdown } from "../monthly/components/category-breakdown"
import { ExpenseList } from "../monthly/components/expense-list"

const ALL_CATEGORIES = "all"
const UNCATEGORIZED = "uncategorized"
const HIDDEN_CATEGORIES = "hidden"

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
				...([...presentCategoryIds].some((id) => !listedCategoryIds.has(id))
					? [{ id: HIDDEN_CATEGORIES, label: messages.expenses.hiddenCategory() }]
					: []),
			]
		: []
	const activeFilter = filters.some((item) => item.id === filter) ? filter : ALL_CATEGORIES
	const filteredExpenses =
		query.data?.expenses.filter((expense) => {
			if (activeFilter === ALL_CATEGORIES) return true
			if (activeFilter === UNCATEGORIZED) return expense.categoryId === null
			if (activeFilter === HIDDEN_CATEGORIES)
				return expense.categoryId !== null && !listedCategoryIds.has(expense.categoryId)
			return expense.categoryId === activeFilter
		}) ?? []

	function moveMonth(offset: number): void {
		setFilter(ALL_CATEGORIES)
		void navigate({ to: "/expenses", search: { month: shiftMonth(month, offset).slice(0, 7) } })
	}

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-md px-6 pb-28 pt-5">
				<header>
					<div className="flex min-h-11 items-center justify-between gap-4">
						<h1 className="app-text-ink text-2xl font-semibold tracking-tight">
							{messages.expenses.recordsTitle()}
						</h1>
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
							{messages.home.addExpense()}
						</Link>
					</div>
					<div className="mt-5 flex items-center justify-between gap-2">
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							aria-label={messages.expenses.previousMonth()}
							className="min-h-11 min-w-11 rounded-xl"
							onClick={() => moveMonth(-1)}
						>
							<ChevronLeft aria-hidden="true" />
						</Button>
						<p aria-live="polite" className="app-text-ink text-base font-semibold tabular-nums">
							{formatMonth(month)}
						</p>
						<div className="shrink-0">
							<Button
								type="button"
								variant="ghost"
								size="icon-lg"
								aria-label={messages.expenses.nextMonth()}
								disabled={month >= currentMonth}
								className="min-h-11 min-w-11 rounded-xl"
								onClick={() => moveMonth(1)}
							>
								<ChevronRight aria-hidden="true" />
							</Button>
						</div>
					</div>
				</header>
				{query.data ? (
					<p className="app-text-muted mt-5 flex items-baseline justify-between gap-3 text-sm">
						<span>{messages.expenses.totalLabel()}</span>
						<strong className="app-text-ink min-w-0 break-all text-right text-base font-semibold tabular-nums">
							{formatYen(query.data.totals.expenses)}
						</strong>
					</p>
				) : null}
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
						<section className="mt-8" aria-label={listLabel}>
							{query.data.expenses.length > 0 ? (
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
												className={`min-h-11 shrink-0 rounded-full px-4 text-sm ${activeFilter === item.id ? "app-category-filter-active font-semibold" : "app-text-ink border-border bg-background"}`}
												onClick={() => setFilter(item.id)}
											>
												{item.label}
											</Button>
										))}
									</div>
								</fieldset>
							) : null}
							<span className="sr-only" aria-live="polite">
								{messages.expenses.resultCount({ count: filteredExpenses.length })}
							</span>
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
						</section>
						{query.data.totals.expenses > 0 ||
						query.data.categories.some((category) => category.budget.status === "set") ? (
							<section
								id="categories"
								className="mt-12 scroll-mt-6"
								aria-labelledby="categories-heading"
							>
								<div className="flex items-center justify-between gap-3">
									<h2 id="categories-heading" className="app-text-ink text-lg font-semibold">
										{messages.home.categoriesTitle()}
									</h2>
								</div>
								<CategoryBreakdown overview={query.data} />
							</section>
						) : null}
					</>
				) : null}
			</main>
		</>
	)
}
