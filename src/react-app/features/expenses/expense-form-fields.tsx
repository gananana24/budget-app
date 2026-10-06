import { ja } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "../../components/ui/button"
import { Calendar } from "../../components/ui/calendar"
import { Field, FieldError, FieldLabel } from "../../components/ui/field"
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
import { formatDate } from "../../i18n/format"
import { messages } from "../../i18n/messages"
import type {
	ExpenseFormErrors,
	ExpenseFormField,
	ExpenseFormValues,
} from "./expense-form-validation"

export const UNCATEGORIZED_VALUE = "uncategorized"

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

export function ExpenseFormFields({
	values,
	errors,
	categories,
	today,
	updateField,
}: Readonly<{
	values: ExpenseFormValues
	errors: ExpenseFormErrors
	categories: ReadonlyArray<{ id: string; name: string }>
	today: string
	updateField: (field: ExpenseFormField, value: string) => void
}>) {
	const [calendarOpen, setCalendarOpen] = useState(false)
	const categoryItems = [
		{ value: UNCATEGORIZED_VALUE, label: messages.expenses.categoryOptional() },
		...categories.map((category) => ({ value: category.id, label: category.name })),
	]
	return (
		<>
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
				<FieldLabel htmlFor="expense-amount">{messages.expenses.amountLabel()}</FieldLabel>
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
				<FieldLabel htmlFor="expense-category">{messages.expenses.categoryLabel()}</FieldLabel>
				<Select
					items={categoryItems}
					value={values.categoryId || UNCATEGORIZED_VALUE}
					onValueChange={(value) =>
						updateField("categoryId", value === UNCATEGORIZED_VALUE ? "" : (value ?? ""))
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
						{categories.map((category) => (
							<SelectItem key={category.id} value={category.id}>
								{category.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
				{errors.categoryId ? (
					<FieldError id="expense-category-error">{errorMessage("categoryId")}</FieldError>
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
		</>
	)
}
