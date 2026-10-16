import { Link } from "@tanstack/react-router"
import { ChevronRight } from "lucide-react"
import { categoryDisplayName } from "../../../i18n/category-name"
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
	const categoriesById = new Map(
		overview.categories.map((category) => [category.id, category] as const),
	)

	if (expenses.length === 0) {
		return (
			<div className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-10 mx-auto w-full max-w-md px-6">
				<div className="ml-auto w-52">
					<p className="app-text-muted text-right text-sm font-medium">
						{messages.expenses.emptyHint()}
					</p>
					<svg
						aria-hidden="true"
						className="ml-auto mr-4 mt-1 h-[4.5rem] w-28 text-[var(--budget-primary)]"
						viewBox="0 0 112 72"
						fill="none"
					>
						<path
							d="M10 8c21-9 43-4 45 14 1 12-15 16-22 8-8-10 4-18 17-12 18 9 20 33 42 40"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
						<path
							d="m77 54 15 4-7-15"
							stroke="currentColor"
							strokeWidth="2.5"
							strokeLinecap="round"
							strokeLinejoin="round"
						/>
					</svg>
				</div>
			</div>
		)
	}

	return (
		<ul
			className="app-card mt-4 divide-y divide-[var(--budget-line)] overflow-hidden px-2"
			aria-label={label}
		>
			{expenses.map((expense) => {
				const category = expense.categoryId ? categoriesById.get(expense.categoryId) : undefined
				const categoryName = expense.categoryId
					? category
						? categoryDisplayName(category)
						: messages.expenses.hiddenCategory()
					: messages.monthly.uncategorized()
				const categoryIconName = expense.categoryId
					? (categoriesById.get(expense.categoryId)?.iconName ?? "tag")
					: "circle-help"
				return (
					<li key={expense.id}>
						{editMonth ? (
							<Link
								to="/expenses/$expenseId/edit"
								params={{ expenseId: expense.id }}
								search={{ month: editMonth }}
								className="flex min-h-18 items-center justify-between gap-3 rounded-xl px-3 py-3 transition-colors active:bg-[var(--budget-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--budget-primary)]"
							>
								<ExpenseRowContent
									expense={expense}
									categoryName={categoryName}
									categoryIconName={categoryIconName}
								/>
								<ChevronRight
									aria-hidden="true"
									className="size-4 shrink-0 text-muted-foreground"
								/>
								<span className="sr-only">{messages.expenses.edit()}</span>
							</Link>
						) : (
							<div className="flex min-h-17 items-center justify-between gap-3 px-3 py-3">
								<ExpenseRowContent
									expense={expense}
									categoryName={categoryName}
									categoryIconName={categoryIconName}
								/>
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
	categoryIconName,
}: Readonly<{ expense: MonthlyExpense; categoryName: string; categoryIconName: string }>) {
	return (
		<>
			<CategoryIcon iconName={categoryIconName} />
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
