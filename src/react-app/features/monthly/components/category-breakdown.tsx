import { CircleAlert } from "lucide-react"
import { formatYen } from "../../../i18n/format"
import { messages } from "../../../i18n/messages"
import type { MonthlyOverview } from "../api/monthly-overview"
import { CategoryIcon } from "./category-icon"

type CategoryBreakdownProps = Readonly<{
	overview: MonthlyOverview
	preview?: boolean
}>

export function CategoryBreakdown({ overview, preview = false }: CategoryBreakdownProps) {
	const categories = [
		...overview.categories.map((category) => ({
			id: category.id,
			name: category.name,
			expenses: category.expenses,
			budget: category.budget,
			remaining: category.remaining,
		})),
		...(overview.uncategorized.expenses > 0
			? [
					{
						id: "uncategorized",
						name: messages.monthly.uncategorized(),
						expenses: overview.uncategorized.expenses,
						budget: null,
						remaining: null,
					},
				]
			: []),
	]
	const relevantCategories = categories.filter(
		(category) => category.expenses > 0 || category.budget?.status === "set",
	)
	const visibleCategories = preview
		? relevantCategories
				.filter((category) => category.expenses > 0)
				.sort((left, right) => {
					const leftOver = left.remaining !== null && left.remaining < 0
					const rightOver = right.remaining !== null && right.remaining < 0
					return Number(rightOver) - Number(leftOver) || right.expenses - left.expenses
				})
				.slice(0, 3)
		: relevantCategories

	if (visibleCategories.length === 0) return null

	return (
		<ul className="mt-4 space-y-1 rounded-2xl bg-white p-3">
			{visibleCategories.map((category) => {
				const isOver = category.remaining !== null && category.remaining < 0
				return (
					<li
						key={category.id}
						className="flex min-w-0 items-center justify-between gap-3 px-1 py-2.5"
					>
						<CategoryIcon name={category.name} />
						<div className="min-w-0 flex-1">
							<p className="app-text-ink truncate text-sm font-semibold">{category.name}</p>
							{category.budget !== null ? (
								<p className="app-text-muted mt-1 text-sm tabular-nums">
									{category.budget.status === "set"
										? messages.home.categoryBudget({ amount: formatYen(category.budget.amount) })
										: messages.home.budgetUnset()}
								</p>
							) : null}
							{category.budget?.status === "set" && category.budget.amount > 0 ? (
								<div
									aria-hidden="true"
									className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--budget-primary-soft)]"
								>
									<div
										className={`h-full rounded-full ${isOver ? "bg-destructive" : "bg-[var(--budget-primary)]"}`}
										style={{
											width: `${Math.min(100, (category.expenses / category.budget.amount) * 100)}%`,
										}}
									/>
								</div>
							) : null}
						</div>
						<div
							className={`flex max-w-[45%] min-w-0 items-center gap-1.5 break-all text-right text-sm font-semibold tabular-nums ${isOver ? "text-destructive" : "app-text-ink"}`}
						>
							{isOver ? <CircleAlert aria-hidden="true" className="size-4" /> : null}
							<span>{formatYen(category.expenses)}</span>
							{isOver ? <span className="sr-only">{messages.home.overBudget()}</span> : null}
						</div>
					</li>
				)
			})}
		</ul>
	)
}
