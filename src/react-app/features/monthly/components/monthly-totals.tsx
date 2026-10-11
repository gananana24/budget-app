import { formatYen } from "../../../i18n/format"
import { messages } from "../../../i18n/messages"
import type { MonthlyOverview } from "../api/monthly-overview"

type MonthlyTotalsProps = Readonly<{
	overview: MonthlyOverview
	className?: string
}>

export function MonthlyTotals({ overview, className = "" }: MonthlyTotalsProps) {
	return (
		<div className={className}>
			<p className="app-text-muted text-sm font-medium">{messages.home.spentLabel()}</p>
			<p className="app-text-ink mt-1 break-all text-[clamp(2rem,9vw,2.8rem)] leading-tight font-semibold tracking-tight tabular-nums">
				{formatYen(overview.totals.expenses)}
			</p>
		</div>
	)
}
