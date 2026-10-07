import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ChevronLeft } from "lucide-react"
import { type FormEvent, useState } from "react"
import { Button, buttonVariants } from "../../components/ui/button"
import { FieldGroup } from "../../components/ui/field"
import { getCurrentMonthStartInTokyo, getTodayInTokyo, suggestDateInMonth } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import {
	getMonthlyOverviewQueryOptions,
	monthlyOverviewQueryKey,
} from "../monthly/api/monthly-overview"
import { createExpense } from "./api/create-expense"
import { ExpenseFormFields } from "./expense-form-fields"
import {
	type ExpenseFormErrors,
	type ExpenseFormField,
	type ExpenseFormValues,
	validateExpenseForm,
} from "./expense-form-validation"

export function NewExpenseScreen() {
	const title = messages.expenses.formTitle()
	const apiClient = useApiClient()
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const today = getTodayInTokyo()
	const selectedMonth = useRouterState({ select: (state) => state.location.search.month })
	const month =
		typeof selectedMonth === "string" ? `${selectedMonth}-01` : getCurrentMonthStartInTokyo()
	const overviewQuery = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))
	const [values, setValues] = useState<ExpenseFormValues>({
		date: suggestDateInMonth(month, today),
		amount: "",
		categoryId: "",
		memo: "",
	})
	const [errors, setErrors] = useState<ExpenseFormErrors>({})
	const mutation = useMutation({
		mutationFn: (input: Parameters<typeof createExpense>[1]) => createExpense(apiClient, input),
		onSuccess: async (_created, input) => {
			const expenseMonth = `${input.date.slice(0, 7)}-01`
			await queryClient.invalidateQueries({ queryKey: monthlyOverviewQueryKey(expenseMonth) })
			await navigate({ to: "/expenses", search: { month: expenseMonth.slice(0, 7) } })
		},
	})

	function updateField(field: ExpenseFormField, value: string): void {
		setValues((current) => ({ ...current, [field]: value }))
		setErrors((current) => ({ ...current, [field]: undefined }))
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		const categoryIds = new Set(overviewQuery.data?.categories.map((category) => category.id) ?? [])
		const nextErrors = validateExpenseForm(values, today, categoryIds)
		setErrors(nextErrors)
		if (Object.keys(nextErrors).length > 0) {
			return
		}

		mutation.mutate({
			date: values.date,
			amount: Number(values.amount),
			categoryId: values.categoryId || null,
			memo: values.memo.trim() || null,
		})
	}

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
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
					<h1 className="app-text-ink text-base font-semibold whitespace-nowrap">{title}</h1>
				</header>
				<div className="pt-8">
					{overviewQuery.isPending ? (
						<p role="status" className="app-text-muted py-12 text-sm">
							{messages.monthly.loading()}
						</p>
					) : null}
					{overviewQuery.isError ? (
						<div role="alert" className="py-8">
							<h2 className="app-text-ink text-lg font-semibold">
								{messages.monthly.errorTitle()}
							</h2>
							<p className="app-text-muted mt-2 text-sm">
								{overviewQuery.error instanceof Error
									? overviewQuery.error.message
									: messages.bootstrap.invalidResponseDescription()}
							</p>
						</div>
					) : null}
					{overviewQuery.data ? (
						<section aria-label={title}>
							<form onSubmit={handleSubmit} noValidate>
								<FieldGroup>
									<ExpenseFormFields
										values={values}
										errors={errors}
										categories={overviewQuery.data.categories}
										today={today}
										updateField={updateField}
									/>

									{mutation.isError ? (
										<p role="alert" className="text-sm text-destructive">
											{mutation.error instanceof Error
												? mutation.error.message
												: messages.bootstrap.invalidResponseDescription()}
										</p>
									) : null}
									<Button
										type="submit"
										size="lg"
										disabled={mutation.isPending}
										className="h-12 w-full bg-[var(--budget-primary)] text-base text-white hover:bg-[var(--budget-primary)]/90"
									>
										{mutation.isPending
											? messages.expenses.submitting()
											: messages.expenses.submit()}
									</Button>
								</FieldGroup>
							</form>
						</section>
					) : null}
				</div>
			</main>
		</>
	)
}
