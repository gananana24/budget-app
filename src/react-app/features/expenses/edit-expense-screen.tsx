import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronLeft, Trash2 } from "lucide-react"
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
import { Button, buttonVariants } from "../../components/ui/button"
import { FieldGroup } from "../../components/ui/field"
import {
	formatDate,
	formatYen,
	getCurrentMonthStartInTokyo,
	getTodayInTokyo,
} from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import {
	getMonthlyOverviewQueryOptions,
	type MonthlyExpense,
	type MonthlyOverview,
	monthlyOverviewQueryKey,
} from "../monthly/api/monthly-overview"
import { deleteExpense, updateExpense } from "./api/change-expense"
import { ExpenseFormFields } from "./expense-form-fields"
import {
	type ExpenseFormErrors,
	type ExpenseFormField,
	type ExpenseFormValues,
	validateExpenseForm,
} from "./expense-form-validation"

export function EditExpenseScreen({ expenseId }: Readonly<{ expenseId: string }>) {
	const apiClient = useApiClient()
	const selectedMonth = useRouterState({ select: (state) => state.location.search.month })
	const month =
		typeof selectedMonth === "string" ? `${selectedMonth}-01` : getCurrentMonthStartInTokyo()
	const overviewQuery = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))
	const expense = overviewQuery.data?.expenses.find((item) => item.id === expenseId)

	return (
		<>
			<title>{formatDocumentTitle(messages.expenses.editTitle())}</title>
			<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-md px-6 pb-12 pt-5">
				<header className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
					<Link
						to="/expenses"
						search={{ month: month.slice(0, 7) }}
						activeOptions={{ exact: true }}
						className={buttonVariants({
							variant: "ghost",
							size: "lg",
							className: "-ml-2 min-h-11 justify-self-start px-2 text-[var(--budget-primary)]",
						})}
					>
						<ChevronLeft aria-hidden="true" />
						{messages.expenses.title()}
					</Link>
					<h1 className="app-text-ink text-base font-semibold whitespace-nowrap">
						{messages.expenses.editTitle()}
					</h1>
				</header>
				{overviewQuery.isPending ? (
					<p role="status" className="py-12">
						{messages.monthly.loading()}
					</p>
				) : null}
				{overviewQuery.isError ? (
					<p role="alert" className="py-12">
						{overviewQuery.error.message}
					</p>
				) : null}
				{overviewQuery.data && !expense ? (
					<p role="alert" className="py-12">
						{messages.expenses.missing()}
					</p>
				) : null}
				{overviewQuery.data && expense ? (
					<EditExpenseForm
						key={expense.id}
						expense={expense}
						overview={overviewQuery.data}
						month={month}
					/>
				) : null}
			</main>
		</>
	)
}

function EditExpenseForm({
	expense,
	overview,
	month,
}: Readonly<{ expense: MonthlyExpense; overview: MonthlyOverview; month: string }>) {
	const apiClient = useApiClient()
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const today = getTodayInTokyo()
	const [values, setValues] = useState<ExpenseFormValues>({
		date: expense.date,
		amount: String(expense.amount),
		categoryId: expense.categoryId ?? "",
		memo: expense.memo ?? "",
	})
	const [errors, setErrors] = useState<ExpenseFormErrors>({})
	const [deleteOpen, setDeleteOpen] = useState(false)
	const retainedCategory =
		expense.categoryId &&
		!overview.categories.some((category) => category.id === expense.categoryId)
			? { id: expense.categoryId, name: messages.expenses.hiddenCategory() }
			: null
	const categories = retainedCategory
		? [...overview.categories, retainedCategory]
		: overview.categories
	const mutation = useMutation({
		mutationFn: (input: Parameters<typeof updateExpense>[2]) =>
			updateExpense(apiClient, expense.id, input),
		onSuccess: async (_updated, input) => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: monthlyOverviewQueryKey(month) }),
				queryClient.invalidateQueries({
					queryKey: monthlyOverviewQueryKey(`${input.date.slice(0, 7)}-01`),
				}),
			])
			await navigate({ to: "/expenses", search: { month: input.date.slice(0, 7) } })
		},
	})
	const deletion = useMutation({
		mutationFn: () => deleteExpense(apiClient, expense.id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: monthlyOverviewQueryKey(month) })
			await navigate({ to: "/expenses", search: { month: month.slice(0, 7) } })
		},
	})

	function updateField(field: ExpenseFormField, value: string): void {
		setValues((current) => ({ ...current, [field]: value }))
		setErrors((current) => ({ ...current, [field]: undefined }))
	}

	function submit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		const categoryIds = new Set(categories.map((category) => category.id))
		const nextErrors = validateExpenseForm(values, today, categoryIds)
		setErrors(nextErrors)
		if (Object.keys(nextErrors).length > 0) return
		mutation.mutate({
			date: values.date,
			amount: Number(values.amount),
			categoryId: values.categoryId || null,
			memo: values.memo.trim() || null,
		})
	}

	return (
		<>
			<form onSubmit={submit} noValidate className="pt-8">
				<FieldGroup>
					<ExpenseFormFields
						values={values}
						errors={errors}
						categories={categories}
						today={today}
						updateField={updateField}
					/>
					{mutation.isError ? (
						<p role="alert" className="text-sm text-destructive">
							{mutation.error.message}
						</p>
					) : null}
					<Button
						type="submit"
						size="lg"
						disabled={mutation.isPending}
						className="h-12 w-full bg-[var(--budget-primary)] text-base text-white hover:bg-[var(--budget-primary)]/90"
					>
						{mutation.isPending ? messages.expenses.saving() : messages.expenses.save()}
					</Button>
				</FieldGroup>
			</form>
			<div className="mt-10 border-t pt-6">
				<Button
					type="button"
					variant="outline"
					disabled={mutation.isPending}
					onClick={() => {
						deletion.reset()
						setDeleteOpen(true)
					}}
					className="min-h-11 w-full border-destructive/30 text-destructive hover:bg-destructive/5 hover:text-destructive"
				>
					<Trash2 aria-hidden="true" />
					{messages.expenses.delete()}
				</Button>
			</div>
			<AlertDialog
				open={deleteOpen}
				onOpenChange={(open) => {
					if (!deletion.isPending) setDeleteOpen(open)
				}}
			>
				<AlertDialogContent className="w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto">
					<AlertDialogHeader>
						<AlertDialogTitle>{messages.expenses.deleteTitle()}</AlertDialogTitle>
						<AlertDialogDescription>
							{messages.expenses.deleteDescription({
								name:
									expense.memo ??
									overview.categories.find((category) => category.id === expense.categoryId)
										?.name ??
									messages.monthly.uncategorized(),
								date: formatDate(expense.date),
								amount: formatYen(expense.amount),
							})}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deletion.isError ? (
						<p role="alert" className="text-sm text-destructive">
							{deletion.error.message}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel className="min-h-11" disabled={deletion.isPending}>
							{messages.expenses.cancel()}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							className="min-h-11"
							disabled={deletion.isPending}
							onClick={() => deletion.mutate()}
						>
							{deletion.isPending ? messages.expenses.deleting() : messages.expenses.delete()}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
