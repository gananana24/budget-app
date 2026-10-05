import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate, useRouterState } from "@tanstack/react-router"
import { ja } from "date-fns/locale"
import { CalendarIcon, ChevronLeft } from "lucide-react"
import { type FormEvent, useState } from "react"
import { Button, buttonVariants } from "../../components/ui/button"
import { Calendar } from "../../components/ui/calendar"
import { Field, FieldError, FieldGroup, FieldLabel } from "../../components/ui/field"
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "../../components/ui/input-group"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
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
	getCurrentMonthStartInTokyo,
	getTodayInTokyo,
	suggestDateInMonth,
} from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import {
	getMonthlyOverviewQueryOptions,
	monthlyOverviewQueryKey,
} from "../monthly/api/monthly-overview"
import { createExpense } from "./api/create-expense"
import {
	type ExpenseFormErrors,
	type ExpenseFormField,
	type ExpenseFormValues,
	validateExpenseForm,
} from "./expense-form-validation"

const UNCATEGORIZED_VALUE = "uncategorized"

function errorMessage(field: ExpenseFormField): string {
	switch (field) {
		case "date":
			return messages.expenses.invalidDate()
		case "amount":
			return messages.expenses.invalidAmount()
		case "categoryId":
			return messages.expenses.invalidCategory()
		case "memo":
			return messages.expenses.invalidMemo()
	}
}

function calendarDateFromIso(value: string): Date {
	const [year, month, day] = value.split("-").map(Number)
	return new Date(year, month - 1, day)
}

function isoDateFromCalendar(date: Date): string {
	const year = date.getFullYear().toString().padStart(4, "0")
	const month = (date.getMonth() + 1).toString().padStart(2, "0")
	const day = date.getDate().toString().padStart(2, "0")
	return `${year}-${month}-${day}`
}

export function NewExpenseScreen() {
	const title = messages.expenses.formTitle()
	const apiClient = useApiClient()
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const today = getTodayInTokyo()
	const selectedMonth = useRouterState({ select: (state) => state.location.search.month })
	const month = typeof selectedMonth === "string" ? selectedMonth : getCurrentMonthStartInTokyo()
	const overviewQuery = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))
	const [calendarOpen, setCalendarOpen] = useState(false)
	const [values, setValues] = useState<ExpenseFormValues>({
		date: suggestDateInMonth(month, today),
		amount: "",
		categoryId: "",
		memo: "",
	})
	const [errors, setErrors] = useState<ExpenseFormErrors>({})
	const categoryItems = [
		{ value: UNCATEGORIZED_VALUE, label: messages.expenses.categoryOptional() },
		...(overviewQuery.data?.categories.map((category) => ({
			value: category.id,
			label: category.name,
		})) ?? []),
	]
	const mutation = useMutation({
		mutationFn: (input: Parameters<typeof createExpense>[1]) => createExpense(apiClient, input),
		onSuccess: async (_created, input) => {
			const expenseMonth = `${input.date.slice(0, 7)}-01`
			await queryClient.invalidateQueries({ queryKey: monthlyOverviewQueryKey(expenseMonth) })
			await navigate({ to: "/expenses", search: { month: expenseMonth } })
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
						search={{ month }}
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
									<Field data-invalid={Boolean(errors.date)}>
										<FieldLabel htmlFor="expense-date">{messages.expenses.dateLabel()}</FieldLabel>
										<Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
											<PopoverTrigger
												render={
													<Button
														id="expense-date"
														type="button"
														variant="outline"
														aria-invalid={Boolean(errors.date)}
														aria-describedby={errors.date ? "expense-date-error" : undefined}
														className="h-12 w-full justify-start px-3 text-base font-normal"
													/>
												}
											>
												<CalendarIcon />
												{formatDate(values.date)}
											</PopoverTrigger>
											<PopoverContent align="start" className="w-auto p-0">
												<Calendar
													className="[--cell-size:2.5rem]"
													mode="single"
													locale={ja}
													selected={calendarDateFromIso(values.date)}
													defaultMonth={calendarDateFromIso(values.date)}
													disabled={{ after: calendarDateFromIso(today) }}
													onSelect={(date) => {
														if (date) {
															updateField("date", isoDateFromCalendar(date))
															setCalendarOpen(false)
														}
													}}
												/>
											</PopoverContent>
										</Popover>
										{errors.date ? (
											<FieldError id="expense-date-error">{errorMessage("date")}</FieldError>
										) : null}
									</Field>

									<Field data-invalid={Boolean(errors.amount)}>
										<FieldLabel htmlFor="expense-amount">
											{messages.expenses.amountLabel()}
										</FieldLabel>
										<InputGroup className="h-12">
											<InputGroupInput
												id="expense-amount"
												type="text"
												inputMode="numeric"
												autoComplete="off"
												value={values.amount}
												aria-invalid={Boolean(errors.amount)}
												aria-describedby={errors.amount ? "expense-amount-error" : undefined}
												className="text-base"
												onChange={(event) => updateField("amount", event.target.value)}
											/>
											<InputGroupAddon align="inline-end">
												<InputGroupText>{messages.expenses.amountUnit()}</InputGroupText>
											</InputGroupAddon>
										</InputGroup>
										{errors.amount ? (
											<FieldError id="expense-amount-error">{errorMessage("amount")}</FieldError>
										) : null}
									</Field>

									<Field data-invalid={Boolean(errors.categoryId)}>
										<FieldLabel htmlFor="expense-category">
											{messages.expenses.categoryLabel()}
										</FieldLabel>
										<Select
											items={categoryItems}
											value={values.categoryId || UNCATEGORIZED_VALUE}
											onValueChange={(value) =>
												updateField(
													"categoryId",
													value === UNCATEGORIZED_VALUE ? "" : (value ?? ""),
												)
											}
										>
											<SelectTrigger
												id="expense-category"
												aria-invalid={Boolean(errors.categoryId)}
												aria-describedby={errors.categoryId ? "expense-category-error" : undefined}
												className="data-[size=default]:h-12 w-full text-base"
											>
												<SelectValue />
											</SelectTrigger>
											<SelectContent align="start">
												<SelectItem value={UNCATEGORIZED_VALUE}>
													{messages.expenses.categoryOptional()}
												</SelectItem>
												{overviewQuery.data.categories.map((category) => (
													<SelectItem key={category.id} value={category.id}>
														{category.name}
													</SelectItem>
												))}
											</SelectContent>
										</Select>
										{errors.categoryId ? (
											<FieldError id="expense-category-error">
												{errorMessage("categoryId")}
											</FieldError>
										) : null}
									</Field>

									<Field data-invalid={Boolean(errors.memo)}>
										<FieldLabel htmlFor="expense-memo">{messages.expenses.memoLabel()}</FieldLabel>
										<Textarea
											id="expense-memo"
											rows={3}
											value={values.memo}
											placeholder={messages.expenses.memoPlaceholder()}
											aria-invalid={Boolean(errors.memo)}
											aria-describedby={errors.memo ? "expense-memo-error" : undefined}
											className="min-h-24 text-base"
											onChange={(event) => updateField("memo", event.target.value)}
										/>
										{errors.memo ? (
											<FieldError id="expense-memo-error">{errorMessage("memo")}</FieldError>
										) : null}
									</Field>

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
