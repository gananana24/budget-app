import { CircleAlert } from "lucide-react"
import { formatYen } from "../../../i18n/format"
import { messages } from "../../../i18n/messages"
import type { MonthlyOverview } from "../api/monthly-overview"

type MonthlyTotalsProps = Readonly<{
	overview: MonthlyOverview
	className?: string
}>

export function MonthlyTotals({ overview, className = "" }: MonthlyTotalsProps) {
	const hasBudget = overview.categories.some((category) => category.budget.status === "set")
	const isOver = hasBudget && overview.totals.remaining < 0

	return (
		<div className={className}>
			<p className="app-text-muted text-sm font-medium">
				{hasBudget ? messages.home.remainingLabel() : messages.home.spentLabel()}
			</p>
			<p
				className={`mt-1 flex items-center gap-2 break-all text-[clamp(2rem,9vw,2.8rem)] leading-tight font-semibold tracking-tight tabular-nums ${isOver ? "text-destructive" : "app-text-ink"}`}
			>
				{isOver ? <CircleAlert aria-hidden="true" className="size-6 shrink-0" /> : null}
				{formatYen(hasBudget ? overview.totals.remaining : overview.totals.expenses)}
			</p>
			{isOver ? <span className="sr-only">{messages.home.overBudget()}</span> : null}
			{hasBudget ? (
				<div className="mt-6 grid grid-cols-2 gap-4">
					<div className="min-w-0">
						<p className="app-text-muted text-sm">{messages.home.spentLabel()}</p>
						<p className="app-text-ink mt-1 break-all text-base font-semibold tabular-nums">
							{formatYen(overview.totals.expenses)}
						</p>
					</div>
					<div className="min-w-0">
						<p className="app-text-muted text-sm">{messages.home.budgetLabel()}</p>
						<p className="app-text-ink mt-1 break-all text-base font-semibold tabular-nums">
							{formatYen(overview.totals.budget)}
						</p>
					</div>
				</div>
			) : (
				<p className="app-text-muted mt-5 text-sm">{messages.home.budgetUnset()}</p>
			)}
		</div>
	)
}
