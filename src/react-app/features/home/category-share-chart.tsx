import { Cell, Pie, PieChart } from "recharts"
import { ChartContainer } from "../../components/ui/chart"
import { categoryDisplayName } from "../../i18n/category-name"
import { formatYen } from "../../i18n/format"
import { messages } from "../../i18n/messages"
import type { MonthlyOverview } from "../monthly/api/monthly-overview"

const chartColors = [
	"var(--budget-chart-1)",
	"var(--budget-chart-2)",
	"var(--budget-chart-3)",
	"var(--budget-chart-6)",
]

export function CategoryShareChart({ overview }: Readonly<{ overview: MonthlyOverview }>) {
	const categories = [
		...overview.categories.map((category) => ({
			id: category.id,
			name: categoryDisplayName(category),
			expenses: category.expenses,
			isOther: category.seedKey === "other",
		})),
		{
			id: "uncategorized",
			name: messages.monthly.uncategorized(),
			expenses: overview.uncategorized.expenses,
			isOther: false,
		},
	]
		.filter((category) => category.expenses > 0)
		.sort((left, right) => right.expenses - left.expenses)
	const topCategories = categories.filter((category) => !category.isOther).slice(0, 3)
	const topCategoryIds = new Set(topCategories.map((category) => category.id))
	const remainingExpenses = categories
		.filter((category) => !topCategoryIds.has(category.id))
		.reduce((sum, category) => sum + category.expenses, 0)
	const slices = [
		...topCategories,
		...(remainingExpenses > 0
			? [{ id: "remaining", name: messages.home.otherCategories(), expenses: remainingExpenses }]
			: []),
	]
	const total = overview.totals.expenses

	if (total === 0 || slices.length === 0) return null

	return (
		<div className="mt-9 flex w-full flex-col items-center gap-6">
			<ChartContainer
				config={{}}
				initialDimension={{ width: 160, height: 160 }}
				aria-hidden="true"
				className="aspect-square w-full max-w-64"
			>
				<PieChart accessibilityLayer={false}>
					<Pie
						data={slices}
						dataKey="expenses"
						nameKey="name"
						cx="50%"
						cy="50%"
						innerRadius="64%"
						outerRadius="94%"
						startAngle={90}
						endAngle={-270}
						stroke="var(--background)"
						strokeWidth={2}
						isAnimationActive={false}
					>
						{slices.map((slice, index) => (
							<Cell
								key={slice.id}
								fill={slice.id === "remaining" ? chartColors[3] : chartColors[index]}
							/>
						))}
					</Pie>
				</PieChart>
			</ChartContainer>
			<ul className="w-full min-w-0 space-y-2">
				{slices.map((slice, index) => (
					<li key={slice.id} className="flex min-h-6 min-w-0 items-center gap-2 text-sm leading-5">
						<span
							aria-hidden="true"
							className="size-3 shrink-0 rounded-full"
							style={{
								backgroundColor: slice.id === "remaining" ? chartColors[3] : chartColors[index],
							}}
						/>
						<span className="app-text-ink min-w-0 flex-1 truncate whitespace-nowrap">
							{slice.name}
						</span>
						<span className="app-text-muted shrink-0 whitespace-nowrap text-right tabular-nums">
							{formatYen(slice.expenses)}
						</span>
					</li>
				))}
			</ul>
		</div>
	)
}
