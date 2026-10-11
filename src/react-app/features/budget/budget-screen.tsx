import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { type FormEvent, useState } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../../components/ui/alert-dialog"
import { Button } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { formatMonth, formatYen, getCurrentMonthStartInTokyo, shiftMonth } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import {
	getMonthlyOverviewQueryOptions,
	type MonthlyCategory,
	monthlyOverviewQueryKey,
} from "../monthly/api/monthly-overview"
import { CategoryIcon } from "../monthly/components/category-icon"
import {
	type BudgetDraft,
	budgetDraftQueryKey,
	deleteBudget,
	getBudgetDraftQueryOptions,
	saveBudgets,
} from "./api/budgets"
import { parseBudgetAmount } from "./budget-form-validation"

type BudgetInput = Readonly<{ categoryId: string; amount: number }>

function BudgetForm({
	month,
	categories,
	draft,
}: Readonly<{
	month: string
	categories: readonly MonthlyCategory[]
	draft: BudgetDraft
}>) {
	const apiClient = useApiClient()
	const queryClient = useQueryClient()
	const [amounts, setAmounts] = useState<Record<string, string>>(() =>
		Object.fromEntries(draft.budgets.map(({ categoryId, amount }) => [categoryId, String(amount)])),
	)
	const [invalidIds, setInvalidIds] = useState<ReadonlySet<string>>(new Set())
	const [formError, setFormError] = useState<string | null>(null)
	const [deleteTarget, setDeleteTarget] = useState<MonthlyCategory | null>(null)
	const [deleteError, setDeleteError] = useState<string | null>(null)

	async function refresh(): Promise<void> {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: budgetDraftQueryKey(month) }),
			queryClient.invalidateQueries({ queryKey: monthlyOverviewQueryKey(month) }),
		])
	}

	const saving = useMutation({
		mutationFn: (budgets: readonly BudgetInput[]) => saveBudgets(apiClient, month, budgets),
		onSuccess: async (saved) => {
			setAmounts(
				Object.fromEntries(
					saved.budgets.map(({ categoryId, amount }) => [categoryId, String(amount)]),
				),
			)
			setFormError(null)
			await refresh()
		},
	})
	const deletion = useMutation({
		mutationFn: (categoryId: string) => deleteBudget(apiClient, month, categoryId),
		onSuccess: async (_result, categoryId) => {
			setAmounts((current) => ({ ...current, [categoryId]: "" }))
			setDeleteTarget(null)
			setDeleteError(null)
			await refresh()
		},
		onError: (error: Error) => setDeleteError(error.message),
	})

	function submit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		const budgets: BudgetInput[] = []
		const invalid = new Set<string>()
		for (const category of categories) {
			const value = amounts[category.id] ?? ""
			if (value === "") continue
			const amount = parseBudgetAmount(value)
			if (amount === null) invalid.add(category.id)
			else budgets.push({ categoryId: category.id, amount })
		}
		setInvalidIds(invalid)
		if (invalid.size > 0) {
			setFormError(messages.budget.invalidAmount())
			return
		}
		if (budgets.length === 0) {
			setFormError(messages.budget.emptySave())
			return
		}
		setFormError(null)
		saving.mutate(budgets)
	}

	return (
		<>
			{!draft.initialized ? (
				<p className="app-text-muted mt-6 rounded-xl bg-[var(--budget-primary-soft)] p-4 text-sm leading-relaxed">
					{messages.budget.carryoverDraft()}
				</p>
			) : null}
			<form onSubmit={submit} noValidate className="mt-6">
				<div className="space-y-3">
					{categories.map((category) => {
						const inputId = `budget-${category.id}`
						const storedAmount = category.budget.status === "set" ? category.budget.amount : null
						return (
							<div key={category.id} className="rounded-xl border border-border bg-background p-4">
								<div className="flex items-center gap-3">
									<CategoryIcon iconName={category.iconName} />
									<label htmlFor={inputId} className="app-text-ink min-w-0 flex-1 font-semibold">
										{category.name}
									</label>
									<span className="app-text-muted text-xs">{messages.budget.yenUnit()}</span>
								</div>
								<Input
									id={inputId}
									type="text"
									inputMode="numeric"
									pattern="[0-9]*"
									value={amounts[category.id] ?? ""}
									placeholder={messages.budget.unset()}
									aria-invalid={invalidIds.has(category.id)}
									disabled={saving.isPending || deletion.isPending}
									className="mt-3 min-h-11 text-right tabular-nums"
									onChange={(event) => {
										setAmounts((current) => ({ ...current, [category.id]: event.target.value }))
										setInvalidIds((current) => {
											const next = new Set(current)
											next.delete(category.id)
											return next
										})
										setFormError(null)
										saving.reset()
									}}
								/>
								<div className="mt-2 flex items-center justify-between gap-2 text-xs">
									<span className="app-text-muted">
										{storedAmount === null
											? messages.budget.unset()
											: messages.budget.currentAmount({ amount: formatYen(storedAmount) })}
									</span>
									{storedAmount !== null ? (
										<Button
											type="button"
											variant="ghost"
											className="min-h-11 px-2 text-destructive"
											disabled={saving.isPending || deletion.isPending}
											onClick={() => {
												setDeleteError(null)
												setDeleteTarget(category)
												deletion.reset()
											}}
										>
											{messages.budget.delete()}
										</Button>
									) : null}
								</div>
							</div>
						)
					})}
				</div>
				{formError || saving.error ? (
					<p role="alert" className="mt-4 text-sm text-destructive">
						{formError ?? saving.error?.message}
					</p>
				) : null}
				<Button
					type="submit"
					size="lg"
					disabled={saving.isPending || deletion.isPending || categories.length === 0}
					className="mt-6 h-12 w-full bg-[var(--budget-primary)] text-base text-white hover:bg-[var(--budget-primary)]/90"
				>
					{saving.isPending ? messages.budget.saving() : messages.budget.save()}
				</Button>
			</form>
			<AlertDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => !open && setDeleteTarget(null)}
			>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>{messages.budget.deleteTitle()}</AlertDialogTitle>
						<AlertDialogDescription>
							{deleteTarget && deleteTarget.budget.status === "set"
								? messages.budget.deleteDescription({
										month: formatMonth(month),
										category: deleteTarget.name,
										amount: formatYen(deleteTarget.budget.amount),
									})
								: ""}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deleteError ? (
						<p role="alert" className="text-sm text-destructive">
							{deleteError}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletion.isPending}>
							{messages.budget.cancel()}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={deletion.isPending}
							onClick={() => deleteTarget && deletion.mutate(deleteTarget.id)}
						>
							{deletion.isPending ? messages.budget.deleting() : messages.budget.confirmDelete()}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}

function BudgetMonth({ month }: Readonly<{ month: string }>) {
	const apiClient = useApiClient()
	const overview = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))
	const draft = useQuery(getBudgetDraftQueryOptions(apiClient, month))
	const error = overview.error ?? draft.error
	return (
		<>
			{overview.isPending || draft.isPending ? (
				<p role="status" className="app-text-muted py-12 text-sm">
					{messages.monthly.loading()}
				</p>
			) : null}
			{error ? (
				<div role="alert" className="py-8">
					<p className="text-sm text-destructive">{error.message}</p>
					<Button
						type="button"
						className="mt-4 min-h-11"
						onClick={() => {
							void overview.refetch()
							void draft.refetch()
						}}
					>
						{messages.action.retry()}
					</Button>
				</div>
			) : null}
			{!error && overview.data && draft.data ? (
				<BudgetForm month={month} categories={overview.data.categories} draft={draft.data} />
			) : null}
		</>
	)
}

export function BudgetScreen() {
	const title = messages.budget.title()
	const navigate = useNavigate()
	const currentMonth = getCurrentMonthStartInTokyo()
	const selectedMonth = useRouterState({ select: (state) => state.location.search.month })
	const requestedMonth =
		typeof selectedMonth === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonth)
			? `${selectedMonth}-01`
			: currentMonth
	const month = requestedMonth <= currentMonth ? requestedMonth : currentMonth

	function moveMonth(offset: number): void {
		void navigate({ to: "/budget", search: { month: shiftMonth(month, offset).slice(0, 7) } })
	}

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-md px-6 pb-28 pt-5">
				<header>
					<h1 className="app-text-ink text-2xl font-semibold tracking-tight">{title}</h1>
					<div className="mt-5 flex items-center justify-between gap-2">
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							aria-label={messages.expenses.previousMonth()}
							className="min-h-11 min-w-11 rounded-xl"
							onClick={() => moveMonth(-1)}
						>
							<ChevronLeft aria-hidden="true" />
						</Button>
						<p aria-live="polite" className="app-text-ink text-base font-semibold tabular-nums">
							{formatMonth(month)}
						</p>
						<Button
							type="button"
							variant="ghost"
							size="icon-lg"
							aria-label={messages.expenses.nextMonth()}
							disabled={month >= currentMonth}
							className="min-h-11 min-w-11 rounded-xl"
							onClick={() => moveMonth(1)}
						>
							<ChevronRight aria-hidden="true" />
						</Button>
					</div>
				</header>
				<BudgetMonth key={month} month={month} />
			</main>
		</>
	)
}
