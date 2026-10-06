import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { Trash2 } from "lucide-react"
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
import { Field, FieldError, FieldGroup, FieldLabel } from "../../components/ui/field"
import { Input } from "../../components/ui/input"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../components/ui/select"
import { Textarea } from "../../components/ui/textarea"
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
import {
	type ExpenseFormErrors,
	type ExpenseFormField,
	type ExpenseFormValues,
	validateExpenseForm,
} from "./expense-form-validation"

const UNCATEGORIZED = "uncategorized"

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
				<header className="flex min-h-11 items-center gap-4">
					<Link
						to="/expenses"
						search={{ month: month.slice(0, 7) }}
						className={buttonVariants({ variant: "ghost" })}
					>
						{messages.expenses.title()}
					</Link>
					<h1 className="app-text-ink text-base font-semibold">{messages.expenses.editTitle()}</h1>
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
					<Field data-invalid={Boolean(errors.date)}>
						<FieldLabel htmlFor="expense-date">{messages.expenses.dateLabel()}</FieldLabel>
						<Input
							id="expense-date"
							type="date"
							max={today}
							value={values.date}
							aria-invalid={Boolean(errors.date)}
							onChange={(event) => updateField("date", event.target.value)}
							className="h-12 text-base"
						/>
						{errors.date ? <FieldError>{messages.expenses.invalidDate()}</FieldError> : null}
					</Field>
					<Field data-invalid={Boolean(errors.amount)}>
						<FieldLabel htmlFor="expense-amount">{messages.expenses.amountLabel()}</FieldLabel>
						<Input
							id="expense-amount"
							type="text"
							inputMode="numeric"
							value={values.amount}
							aria-invalid={Boolean(errors.amount)}
							onChange={(event) => updateField("amount", event.target.value)}
							className="h-12 text-base"
						/>
						{errors.amount ? <FieldError>{messages.expenses.invalidAmount()}</FieldError> : null}
					</Field>
					<Field data-invalid={Boolean(errors.categoryId)}>
						<FieldLabel htmlFor="expense-category">{messages.expenses.categoryLabel()}</FieldLabel>
						<Select
							items={[
								{ value: UNCATEGORIZED, label: messages.expenses.categoryOptional() },
								...categories.map((category) => ({ value: category.id, label: category.name })),
							]}
							value={values.categoryId || UNCATEGORIZED}
							onValueChange={(value) =>
								updateField("categoryId", value === UNCATEGORIZED ? "" : (value ?? ""))
							}
						>
							<SelectTrigger id="expense-category" className="min-h-12 w-full">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value={UNCATEGORIZED}>
									{messages.expenses.categoryOptional()}
								</SelectItem>
								{categories.map((category) => (
									<SelectItem key={category.id} value={category.id}>
										{category.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.categoryId ? (
							<FieldError>{messages.expenses.invalidCategory()}</FieldError>
						) : null}
					</Field>
					<Field data-invalid={Boolean(errors.memo)}>
						<FieldLabel htmlFor="expense-memo">{messages.expenses.memoLabel()}</FieldLabel>
						<Textarea
							id="expense-memo"
							value={values.memo}
							aria-invalid={Boolean(errors.memo)}
							onChange={(event) => updateField("memo", event.target.value)}
							rows={3}
							className="text-base"
						/>
						{errors.memo ? <FieldError>{messages.expenses.invalidMemo()}</FieldError> : null}
					</Field>
					{mutation.isError ? (
						<p role="alert" className="text-sm text-destructive">
							{mutation.error.message}
						</p>
					) : null}
					<Button
						type="submit"
						size="lg"
						disabled={mutation.isPending}
						className="h-12 w-full bg-[var(--budget-primary)] text-white"
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
				<AlertDialogContent>
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
						<AlertDialogCancel disabled={deletion.isPending}>
							{messages.expenses.cancel()}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
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
