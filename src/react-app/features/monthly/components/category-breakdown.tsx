import { categoryDisplayName } from "../../../i18n/category-name"
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
			name: categoryDisplayName(category),
			iconName: category.iconName,
			expenses: category.expenses,
		})),
		...(overview.uncategorized.expenses > 0
			? [
					{
						id: "uncategorized",
						name: messages.monthly.uncategorized(),
						iconName: "circle-help",
						expenses: overview.uncategorized.expenses,
					},
				]
			: []),
	]
	const relevantCategories = categories.filter((category) => category.expenses > 0)
	const visibleCategories = preview
		? relevantCategories
				.filter((category) => category.expenses > 0)
				.sort((left, right) => {
					return right.expenses - left.expenses
				})
				.slice(0, 3)
		: relevantCategories

	if (visibleCategories.length === 0) return null

	return (
		<ul className="mt-4 space-y-1 rounded-2xl bg-white p-3">
			{visibleCategories.map((category) => {
				return (
					<li
						key={category.id}
						className="flex min-w-0 items-center justify-between gap-3 px-1 py-2.5"
					>
						<CategoryIcon iconName={category.iconName} />
						<div className="min-w-0 flex-1">
							<p className="app-text-ink truncate text-sm font-semibold">{category.name}</p>
						</div>
						<div className="app-text-ink flex max-w-[45%] min-w-0 items-center gap-1.5 break-all text-right text-sm font-semibold tabular-nums">
							<span>{formatYen(category.expenses)}</span>
						</div>
					</li>
				)
			})}
		</ul>
	)
}
