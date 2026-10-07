import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { formatShortDate, formatYen } from "../../../i18n/format"
import { messages } from "../../../i18n/messages"
import type { MonthlyExpense, MonthlyOverview } from "../api/monthly-overview"
import { CategoryIcon } from "./category-icon"

type ExpenseListProps = Readonly<{
	overview: MonthlyOverview
	expenses?: readonly MonthlyExpense[]
	label: string
	editMonth?: string
}>

export function ExpenseList({
	overview,
	expenses = overview.expenses,
	label,
	editMonth,
}: ExpenseListProps) {
	const categoryNames = new Map(
		overview.categories.map((category) => [category.id, category.name] as const),
	)

	if (expenses.length === 0) {
		return (
			<div className="py-8 text-center">
				<h3 className="app-text-ink text-base font-semibold">{messages.expenses.emptyTitle()}</h3>
				<p className="app-text-muted mt-2 text-sm leading-6">
					{messages.expenses.emptyDescription()}
				</p>
			</div>
		)
	}

	return (
		<ul className="mt-4 space-y-1 rounded-2xl bg-white p-2" aria-label={label}>
			{expenses.map((expense) => {
				const categoryName = expense.categoryId
					? (categoryNames.get(expense.categoryId) ?? messages.expenses.hiddenCategory())
					: messages.monthly.uncategorized()
				return (
					<li key={expense.id}>
						{editMonth ? (
							<Link
								to="/expenses/$expenseId/edit"
								params={{ expenseId: expense.id }}
								search={{ month: editMonth }}
								className="flex min-h-18 items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors hover:bg-[var(--budget-primary-soft)] focus-visible:outline-2 focus-visible:outline-[var(--budget-primary)]"
							>
								<ExpenseRowContent expense={expense} categoryName={categoryName} />
								<ChevronRight
									aria-hidden="true"
									className="size-4 shrink-0 text-muted-foreground"
								/>
								<span className="sr-only">{messages.expenses.edit()}</span>
							</Link>
						) : (
							<div className="flex min-h-17 items-center justify-between gap-3 px-3 py-3">
								<ExpenseRowContent expense={expense} categoryName={categoryName} />
							</div>
						)}
					</li>
				)
			})}
		</ul>
	)
}

function ExpenseRowContent({
	expense,
	categoryName,
}: Readonly<{ expense: MonthlyExpense; categoryName: string }>) {
	return (
		<>
			<CategoryIcon name={categoryName} />
			<div className="min-w-0 flex-1">
				<p className="app-text-ink line-clamp-2 text-[0.9375rem] font-semibold">
					{expense.memo || categoryName}
				</p>
				<p className="app-text-muted mt-1 text-sm">
					{formatShortDate(expense.date)}
					{expense.memo ? ` · ${categoryName}` : ""}
				</p>
			</div>
			<div className="min-w-0 max-w-[40%] text-right">
				<p className="app-text-ink break-all text-[0.9375rem] font-semibold tabular-nums">
					{formatYen(expense.amount)}
				</p>
			</div>
		</>
	)
}
