import { useQuery } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight, ListFilter } from "lucide-react"
import { useState } from "react"
import { Screen } from "../../components/screen"
import { Button } from "../../components/ui/button"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../components/ui/select"
import { categoryDisplayName } from "../../i18n/category-name"
import { formatMonth, formatYen, getCurrentMonthStartInTokyo, shiftMonth } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { getMonthlyOverviewQueryOptions } from "../monthly/api/monthly-overview"
import { ExpenseList } from "../monthly/components/expense-list"
import { AddExpenseAction } from "./add-expense-action"

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
				{
					id: ALL_CATEGORIES,
					label: messages.expenses.filterAll(),
					expenses: query.data.totals.expenses,
				},
				...(query.data.expenses.some((expense) => expense.categoryId === null)
					? [
							{
								id: UNCATEGORIZED,
								label: messages.monthly.uncategorized(),
								expenses: query.data.uncategorized.expenses,
							},
						]
					: []),
				...query.data.categories
					.filter((category) => presentCategoryIds.has(category.id))
					.map((category) => ({
						id: category.id,
						label: categoryDisplayName(category),
						expenses: category.expenses,
					})),
				...([...presentCategoryIds].some((id) => !listedCategoryIds.has(id))
					? [
							{
								id: HIDDEN_CATEGORIES,
								label: messages.expenses.hiddenCategory(),
								expenses: query.data.expenses
									.filter(
										(expense) =>
											expense.categoryId !== null && !listedCategoryIds.has(expense.categoryId),
									)
									.reduce((sum, expense) => sum + expense.amount, 0),
							},
						]
					: []),
			].sort((left, right) => {
				if (left.id === ALL_CATEGORIES) return -1
				if (right.id === ALL_CATEGORIES) return 1
				return right.expenses - left.expenses
			})
		: []
	const activeFilter = filters.some((item) => item.id === filter) ? filter : ALL_CATEGORIES
	const selectedFilter = filters.find((item) => item.id === activeFilter)
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
			<Screen title={title} primaryAction={<AddExpenseAction month={month} />}>
				<div className="grid grid-cols-[2.75rem_minmax(0,1fr)_2.75rem] items-center gap-2">
					<Button
						type="button"
						variant="ghost"
						size="icon-lg"
						aria-label={messages.expenses.previousMonth()}
						className="size-11 rounded-xl"
						onClick={() => moveMonth(-1)}
					>
						<ChevronLeft aria-hidden="true" />
					</Button>
					<h2
						aria-live="polite"
						className="app-text-ink min-w-0 truncate text-center text-lg font-semibold tabular-nums"
					>
						{formatMonth(month)}
					</h2>
					<Button
						type="button"
						variant="ghost"
						size="icon-lg"
						aria-label={messages.expenses.nextMonth()}
						disabled={month >= currentMonth}
						className="size-11 rounded-xl"
						onClick={() => moveMonth(1)}
					>
						<ChevronRight aria-hidden="true" />
					</Button>
				</div>
				{query.data ? (
					<p className="mt-5 text-center">
						<span className="sr-only">{messages.expenses.totalLabel()}: </span>
						<strong className="app-text-ink block break-all text-[clamp(1.875rem,8vw,2rem)] leading-tight font-semibold tracking-tight tabular-nums">
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
								<div className="mb-4">
									<Select
										items={filters.map((item) => ({ value: item.id, label: item.label }))}
										value={activeFilter}
										onValueChange={(value) => setFilter(value ?? ALL_CATEGORIES)}
									>
										<SelectTrigger
											id="expense-category-filter"
											aria-label={messages.expenses.filterCategoryLabel()}
											className="min-h-12 w-full rounded-xl border-border bg-white px-4 text-sm"
										>
											<SelectValue>
												<span className="flex w-full min-w-0 items-center justify-between gap-3">
													<span className="flex min-w-0 items-center gap-2">
														<ListFilter
															aria-hidden="true"
															className="size-4 shrink-0 text-muted-foreground"
														/>
														<span className="truncate">{selectedFilter?.label}</span>
													</span>
													{activeFilter !== ALL_CATEGORIES ? (
														<span className="shrink-0 tabular-nums">
															{formatYen(selectedFilter?.expenses ?? 0)}
														</span>
													) : null}
												</span>
											</SelectValue>
										</SelectTrigger>
										<SelectContent align="end" className="max-h-72 min-w-56 p-1.5">
											{filters.map((item) => (
												<SelectItem key={item.id} value={item.id} className="min-h-12 px-3 pr-10">
													<span className="flex w-full min-w-0 items-center justify-between gap-3">
														<span className="truncate">{item.label}</span>
														<span className="shrink-0 tabular-nums">
															{formatYen(item.expenses)}
														</span>
													</span>
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>
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
					</>
				) : null}
			</Screen>
		</>
	)
}
