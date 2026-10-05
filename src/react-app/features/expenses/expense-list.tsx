import { formatDate, formatYen } from "../../i18n/format"
import { messages } from "../../i18n/messages"
import type { MonthlyOverview } from "../monthly/api/monthly-overview"

type ExpenseListProps = Readonly<{
	overview: MonthlyOverview
}>

export function ExpenseList({ overview }: ExpenseListProps) {
	const categoryNames = new Map(
		overview.categories.map((category) => [category.id, category.name] as const),
	)

	if (overview.expenses.length === 0) {
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
		<ul className="divide-y app-divider" aria-label={messages.monthly.expenseListTitle()}>
			{overview.expenses.map((expense) => (
				<li key={expense.id} className="flex items-start justify-between gap-4 py-4">
					<div className="min-w-0">
						<p className="app-text-ink text-sm font-medium">
							{expense.categoryId
								? (categoryNames.get(expense.categoryId) ?? messages.monthly.uncategorized())
								: messages.monthly.uncategorized()}
						</p>
						<p className="app-text-muted mt-1 text-xs">{formatDate(expense.date)}</p>
						{expense.memo ? (
							<p className="app-text-muted mt-1 truncate text-sm">{expense.memo}</p>
						) : null}
					</div>
					<p className="app-text-ink shrink-0 text-base font-semibold tabular-nums">
						{formatYen(expense.amount)}
					</p>
				</li>
			))}
		</ul>
	)
}
