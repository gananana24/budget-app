import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { type FormEvent, useState } from "react"
import { Screen } from "../../components/screen"
import { Button } from "../../components/ui/button"
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
	formatYen,
	getCurrentMonthStartInTokyo,
	getTodayInTokyo,
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
import { ExpenseList } from "./expense-list"

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

export function ExpensesScreen() {
	const title = messages.expenses.title()
	const apiClient = useApiClient()
	const queryClient = useQueryClient()
	const today = getTodayInTokyo()
	const month = getCurrentMonthStartInTokyo()
	const overviewQuery = useQuery(getMonthlyOverviewQueryOptions(apiClient, month))
	const [calendarOpen, setCalendarOpen] = useState(false)
	const [values, setValues] = useState<ExpenseFormValues>({
		date: today,
		amount: "",
		categoryId: "",
		memo: "",
	})
	const [errors, setErrors] = useState<ExpenseFormErrors>({})
	const [created, setCreated] = useState(false)
	const categoryItems = [
		{ value: UNCATEGORIZED_VALUE, label: messages.expenses.categoryOptional() },
		...(overviewQuery.data?.categories.map((category) => ({
			value: category.id,
			label: category.name,
		})) ?? []),
	]
	const mutation = useMutation({
		mutationFn: (input: Parameters<typeof createExpense>[1]) => createExpense(apiClient, input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: monthlyOverviewQueryKey(month) })
			setValues((current) => ({ ...current, amount: "", categoryId: "", memo: "" }))
			setCreated(true)
		},
	})

	function updateField(field: ExpenseFormField, value: string): void {
		setValues((current) => ({ ...current, [field]: value }))
		setErrors((current) => ({ ...current, [field]: undefined }))
		setCreated(false)
	}

	function handleSubmit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		const categoryIds = new Set(overviewQuery.data?.categories.map((category) => category.id) ?? [])
		const nextErrors = validateExpenseForm(values, today, categoryIds)
		setErrors(nextErrors)
		setCreated(false)
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
			<Screen title={title}>
				{overviewQuery.isPending ? (
					<p role="status" className="app-text-muted py-12 text-sm">
						{messages.monthly.loading()}
					</p>
				) : null}
				{overviewQuery.isError ? (
					<div role="alert" className="py-8">
						<h2 className="app-text-ink text-lg font-semibold">{messages.monthly.errorTitle()}</h2>
						<p className="app-text-muted mt-2 text-sm">
							{overviewQuery.error instanceof Error
								? overviewQuery.error.message
								: messages.bootstrap.invalidResponseDescription()}
						</p>
					</div>
				) : null}
				{overviewQuery.data ? (
					<>
						<section aria-labelledby="expense-form-heading">
							<h2 id="expense-form-heading" className="app-text-ink text-lg font-semibold">
								{messages.expenses.formTitle()}
							</h2>
							<form className="mt-6" onSubmit={handleSubmit} noValidate>
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
									{created ? (
										<p role="status" className="text-sm text-[var(--budget-primary)]">
											{messages.expenses.created()}
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
						<section
							className="app-divider mt-10 border-t pt-6"
							aria-labelledby="expense-list-heading"
						>
							<div className="flex items-baseline justify-between gap-4">
								<h2 id="expense-list-heading" className="app-text-ink text-lg font-semibold">
									{messages.monthly.expenseListTitle()}
								</h2>
								<p className="app-text-ink font-semibold tabular-nums">
									{formatYen(overviewQuery.data.totals.expenses)}
								</p>
							</div>
							<ExpenseList overview={overviewQuery.data} />
						</section>
					</>
				) : null}
			</Screen>
		</>
	)
}
