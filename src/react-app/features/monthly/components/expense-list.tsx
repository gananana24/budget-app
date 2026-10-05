import { formatShortDate, formatYen } from "../../../i18n/format"
import { messages } from "../../../i18n/messages"
import type { MonthlyExpense, MonthlyOverview } from "../api/monthly-overview"

type ExpenseListProps = Readonly<{
	overview: MonthlyOverview
	expenses?: readonly MonthlyExpense[]
	label: string
}>

export function ExpenseList({ overview, expenses = overview.expenses, label }: ExpenseListProps) {
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
		<ul className="mt-4 divide-y app-divider" aria-label={label}>
			{expenses.map((expense) => {
				const categoryName = expense.categoryId
					? (categoryNames.get(expense.categoryId) ?? messages.monthly.uncategorized())
					: messages.monthly.uncategorized()
				return (
					<li key={expense.id} className="flex min-h-17 items-center justify-between gap-4 py-3">
						<div className="min-w-0">
							<p className="app-text-ink truncate text-[0.9375rem] font-semibold">
								{expense.memo || categoryName}
							</p>
							<p className="app-text-muted mt-1 text-xs">
								{formatShortDate(expense.date)}
								{expense.memo ? ` · ${categoryName}` : ""}
							</p>
						</div>
						<p className="app-text-ink shrink-0 text-[0.9375rem] font-semibold tabular-nums">
							{formatYen(expense.amount)}
						</p>
					</li>
				)
			})}
		</ul>
	)
}
