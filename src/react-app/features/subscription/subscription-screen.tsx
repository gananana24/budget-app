import { useQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { ChevronRight, Plus } from "lucide-react"
import type { SubscriptionResponse } from "../../../shared/api/subscription"
import { Screen } from "../../components/screen"
import { buttonVariants } from "../../components/ui/button"
import { formatDate, formatYen } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { CategoryIcon } from "../monthly/components/category-icon"
import { getCategoriesQueryOptions } from "../settings/api/categories"
import { subscriptionsQueryOptions } from "./api"

function intervalLabel(subscription: SubscriptionResponse): string {
	return subscription.intervalUnit === "month"
		? messages.subscription.month()
		: messages.subscription.year()
}

export function SubscriptionScreen() {
	const apiClient = useApiClient()
	const subscriptions = useQuery(subscriptionsQueryOptions(apiClient))
	const categories = useQuery(getCategoriesQueryOptions(apiClient))
	const categoryIcons = new Map(
		categories.data?.categories.map((category) => [category.id, category.iconName]),
	)
	const title = messages.subscription.title()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen title={title}>
				{subscriptions.isPending || categories.isPending ? (
					<p role="status" className="app-text-muted py-12 text-sm">
						{messages.subscription.loading()}
					</p>
				) : null}
				{subscriptions.isError || categories.isError ? (
					<p role="alert" className="py-8 text-destructive">
						{messages.subscription.error()}
					</p>
				) : null}
				{subscriptions.data && categories.data ? (
					<>
						<p className="text-center">
							<span className="app-text-muted block text-sm">
								{messages.subscription.monthlyTotal()}
							</span>
							<strong className="app-text-ink mt-2 block break-all text-[clamp(1.875rem,8vw,2rem)] leading-tight font-semibold tracking-tight tabular-nums">
								{formatYen(Math.round(subscriptions.data.monthlyTotal))}
							</strong>
						</p>
						<Link
							to="/subscriptions/new"
							className={cn(
								buttonVariants({ size: "lg" }),
								"app-primary-action mt-6 h-12 w-full rounded-xl text-base font-semibold",
							)}
						>
							<Plus aria-hidden="true" />
							{messages.subscription.add()}
						</Link>
						{subscriptions.data.subscriptions.length > 0 ? (
							<ul
								className="app-card mt-6 divide-y divide-[var(--budget-line)] overflow-hidden px-2"
								aria-label={title}
							>
								{subscriptions.data.subscriptions.map((subscription) => (
									<li key={subscription.id}>
										<Link
											to="/subscriptions/$subscriptionId/edit"
											params={{ subscriptionId: subscription.id }}
											className="flex min-h-18 items-center gap-3 rounded-xl px-3 py-3 transition-colors active:bg-[var(--budget-primary-soft)] focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[var(--budget-primary)]"
										>
											<CategoryIcon
												iconName={
													subscription.categoryId
														? (categoryIcons.get(subscription.categoryId) ?? "tag")
														: "circle-help"
												}
											/>
											<div className="min-w-0 flex-1">
												<p className="app-text-ink line-clamp-2 text-[0.9375rem] font-semibold">
													{subscription.name}
												</p>
												<p className="app-text-muted mt-1 text-sm">
													{intervalLabel(subscription)} · {formatDate(subscription.nextPaymentDate)}
												</p>
											</div>
											<div className="min-w-0 max-w-[40%] text-right">
												<p className="app-text-ink text-[0.9375rem] font-semibold tabular-nums">
													{formatYen(Math.round(subscription.monthlyAmount))}
												</p>
											</div>
											<ChevronRight
												aria-hidden="true"
												className="size-4 shrink-0 text-muted-foreground"
											/>
										</Link>
									</li>
								))}
							</ul>
						) : (
							<p className="app-text-muted mt-8 text-center text-sm">
								{messages.subscription.emptyHint()}
							</p>
						)}
					</>
				) : null}
			</Screen>
		</>
	)
}
