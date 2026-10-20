import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link, useNavigate } from "@tanstack/react-router"
import { ChevronLeft, Trash2 } from "lucide-react"
import { type FormEvent, useState } from "react"
import type { SubscriptionResponse, SubscriptionWrite } from "../../../shared/api/subscription"
import { DeleteConfirmationDialog } from "../../components/delete-confirmation-dialog"
import { Button, buttonVariants } from "../../components/ui/button"
import { Field, FieldError, FieldGroup, FieldLabel } from "../../components/ui/field"
import { Input } from "../../components/ui/input"
import {
	InputGroup,
	InputGroupAddon,
	InputGroupInput,
	InputGroupText,
} from "../../components/ui/input-group"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../components/ui/select"
import { categoryDisplayName } from "../../i18n/category-name"
import { getTodayInTokyo } from "../../i18n/format"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { getLocale } from "../../paraglide/runtime.js"
import { CategoryIcon } from "../monthly/components/category-icon"
import { getCategoriesQueryOptions } from "../settings/api/categories"
import {
	createSubscription,
	endSubscription,
	subscriptionsQueryKey,
	subscriptionsQueryOptions,
	updateSubscription,
} from "./api"

type FormState = Readonly<{
	name: string
	amount: string
	categoryId: string
	billingMonth: string
	billingDay: string
	holidayAdjustment: "none" | "previous" | "next"
}>

type FormField = keyof FormState

type Errors = Partial<Record<FormField, string>>

function maxDayForPeriod(month: number): number {
	return month === 0 ? 31 : new Date(Date.UTC(2028, month, 0)).getUTCDate()
}

function periodLabel(period: string): string {
	if (period === "0") return messages.subscription.month()
	const month = Number(period)
	const monthName = new Intl.DateTimeFormat(getLocale(), { month: "long" }).format(
		new Date(2028, month - 1, 1),
	)
	return messages.subscription.annualMonth({ month: monthName })
}

function initialForm(subscription?: SubscriptionResponse): FormState {
	return {
		name: subscription?.name ?? "",
		amount: subscription ? String(subscription.amount) : "",
		categoryId: subscription?.categoryId ?? "",
		billingMonth: subscription?.billingMonth ? String(subscription.billingMonth) : "0",
		billingDay: subscription
			? String(subscription.billingDay)
			: String(Number(getTodayInTokyo().slice(8))),
		holidayAdjustment: subscription?.holidayAdjustment ?? "none",
	}
}

function validate(form: FormState, categoryIds: ReadonlySet<string>): Errors {
	const errors: Record<string, string> = {}
	const amount = Number(form.amount)
	if (!form.amount || !Number.isSafeInteger(amount) || amount < 1 || amount > 2_147_483_647)
		errors.amount = messages.expenses.invalidAmount()
	if (!form.name.trim() || [...form.name.trim()].length > 50)
		errors.name = messages.subscription.invalid()
	const month = Number(form.billingMonth)
	const day = Number(form.billingDay)
	const maxDay = maxDayForPeriod(month)
	if (!Number.isInteger(month) || month < 0 || month > 12)
		errors.billingMonth = messages.subscription.invalid()
	if (!Number.isInteger(day) || day < 1 || day > maxDay)
		errors.billingDay = messages.subscription.invalid()
	if (form.categoryId && !categoryIds.has(form.categoryId))
		errors.categoryId = messages.expenses.invalidCategory()
	return errors
}

function toWrite(form: FormState): SubscriptionWrite {
	return {
		name: form.name.trim(),
		amount: Number(form.amount),
		categoryId: form.categoryId || null,
		intervalUnit: form.billingMonth === "0" ? "month" : "year",
		billingMonth: form.billingMonth === "0" ? null : Number(form.billingMonth),
		billingDay: Number(form.billingDay),
		holidayAdjustment: form.holidayAdjustment,
	}
}

export function SubscriptionFormScreen({ subscriptionId }: Readonly<{ subscriptionId?: string }>) {
	const apiClient = useApiClient()
	const subscriptions = useQuery(subscriptionsQueryOptions(apiClient))
	const categories = useQuery(getCategoriesQueryOptions(apiClient))
	const subscription = subscriptionId
		? subscriptions.data?.subscriptions.find((item) => item.id === subscriptionId)
		: undefined
	const title = subscriptionId ? messages.subscription.edit() : messages.subscription.add()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<main
				id="main-content"
				tabIndex={-1}
				className="mx-auto w-full max-w-md px-6 pb-[calc(3rem+env(safe-area-inset-bottom))] pt-5"
			>
				<header className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
					<Link
						to="/subscriptions"
						className={buttonVariants({
							variant: "ghost",
							size: "lg",
							className: "-ml-2 min-h-11 justify-self-start px-2 text-[var(--budget-primary)]",
						})}
					>
						<ChevronLeft aria-hidden="true" />
						{messages.subscription.title()}
					</Link>
					<h1 className="app-text-ink whitespace-nowrap text-base font-semibold">{title}</h1>
				</header>
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
				{subscriptions.data && categories.data && subscriptionId && !subscription ? (
					<p role="alert" className="py-8">
						{messages.expenses.missing()}
					</p>
				) : null}
				{subscriptions.data && categories.data && (!subscriptionId || subscription) ? (
					<SubscriptionForm
						key={subscription?.id ?? "new"}
						subscription={subscription}
						categories={categories.data.categories}
					/>
				) : null}
			</main>
		</>
	)
}

function SubscriptionForm({
	subscription,
	categories,
}: Readonly<{
	subscription?: SubscriptionResponse
	categories: ReadonlyArray<{ id: string; name: string; seedKey: string | null; iconName: string }>
}>) {
	const apiClient = useApiClient()
	const queryClient = useQueryClient()
	const navigate = useNavigate()
	const [values, setValues] = useState<FormState>(() => initialForm(subscription))
	const [errors, setErrors] = useState<Errors>({})
	const [deleteOpen, setDeleteOpen] = useState(false)
	const categoryItems = [
		{ value: "uncategorized", label: messages.monthly.uncategorized() },
		...categories.map((item) => ({ value: item.id, label: categoryDisplayName(item) })),
	]
	const save = useMutation({
		mutationFn: (input: SubscriptionWrite) =>
			subscription
				? updateSubscription(apiClient, subscription.id, input)
				: createSubscription(apiClient, input),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey })
			await navigate({ to: "/subscriptions" })
		},
	})
	const deletion = useMutation({
		mutationFn: () => endSubscription(apiClient, subscription!.id),
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: subscriptionsQueryKey })
			await navigate({ to: "/subscriptions" })
		},
	})

	function updateField<Key extends FormField>(field: Key, value: FormState[Key]): void {
		setValues((current) => ({ ...current, [field]: value }))
		setErrors((current) => ({ ...current, [field]: undefined }))
	}

	function submit(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		const nextErrors = validate(values, new Set(categories.map((item) => item.id)))
		setErrors(nextErrors)
		if (Object.keys(nextErrors).length > 0) return
		save.mutate(toWrite(values))
	}

	return (
		<>
			<form onSubmit={submit} noValidate className="pt-8">
				<FieldGroup>
					<Field data-invalid={Boolean(errors.amount)}>
						<FieldLabel htmlFor="subscription-amount">{messages.subscription.amount()}</FieldLabel>
						<InputGroup className="h-18 rounded-xl bg-white">
							<InputGroupInput
								id="subscription-amount"
								type="text"
								inputMode="numeric"
								autoComplete="off"
								value={values.amount}
								aria-invalid={Boolean(errors.amount)}
								aria-describedby={errors.amount ? "subscription-amount-error" : undefined}
								className="h-full text-2xl font-medium tabular-nums md:text-2xl"
								onChange={(event) => updateField("amount", event.target.value)}
							/>
							<InputGroupAddon align="inline-end">
								<InputGroupText>{messages.expenses.amountUnit()}</InputGroupText>
							</InputGroupAddon>
						</InputGroup>
						{errors.amount ? (
							<FieldError id="subscription-amount-error">{errors.amount}</FieldError>
						) : null}
					</Field>
					<Field data-invalid={Boolean(errors.name)}>
						<FieldLabel htmlFor="subscription-name">{messages.subscription.name()}</FieldLabel>
						<Input
							id="subscription-name"
							maxLength={50}
							value={values.name}
							aria-invalid={Boolean(errors.name)}
							aria-describedby={errors.name ? "subscription-name-error" : undefined}
							className="h-14 rounded-xl bg-white px-4 text-base md:text-base"
							onChange={(event) => updateField("name", event.target.value)}
						/>
						{errors.name ? (
							<FieldError id="subscription-name-error">{errors.name}</FieldError>
						) : null}
					</Field>
					<Field data-invalid={Boolean(errors.billingMonth)}>
						<FieldLabel htmlFor="subscription-interval">
							{messages.subscription.interval()}
						</FieldLabel>
						<Select
							value={values.billingMonth}
							onValueChange={(value) => {
								if (!value) return
								updateField("billingMonth", value)
								const maxDay = maxDayForPeriod(Number(value))
								if (Number(values.billingDay) > maxDay) updateField("billingDay", String(maxDay))
							}}
						>
							<SelectTrigger
								id="subscription-interval"
								className="data-[size=default]:h-14 w-full rounded-xl bg-white px-4 text-base"
							>
								<SelectValue>{() => periodLabel(values.billingMonth)}</SelectValue>
							</SelectTrigger>
							<SelectContent align="start" alignItemWithTrigger={false} className="max-h-72 p-1.5">
								<SelectItem value="0" className="min-h-12 px-3 pr-10 text-base">
									{messages.subscription.month()}
								</SelectItem>
								{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => {
									return (
										<SelectItem
											key={month}
											value={String(month)}
											className="min-h-12 px-3 pr-10 text-base"
										>
											{periodLabel(String(month))}
										</SelectItem>
									)
								})}
							</SelectContent>
						</Select>
						{errors.billingMonth ? <FieldError>{errors.billingMonth}</FieldError> : null}
					</Field>
					<Field data-invalid={Boolean(errors.billingDay)}>
						<FieldLabel htmlFor="subscription-billing-day">
							{messages.subscription.billingDay()}
						</FieldLabel>
						<Select
							value={values.billingDay}
							onValueChange={(value) => {
								if (value) updateField("billingDay", value)
							}}
						>
							<SelectTrigger
								id="subscription-billing-day"
								className="data-[size=default]:h-14 w-full rounded-xl bg-white px-4 text-base"
							>
								<SelectValue>
									{() => messages.subscription.dayOption({ day: Number(values.billingDay) })}
								</SelectValue>
							</SelectTrigger>
							<SelectContent align="start" alignItemWithTrigger={false} className="max-h-72 p-1.5">
								{Array.from(
									{
										length: maxDayForPeriod(Number(values.billingMonth)),
									},
									(_, index) => index + 1,
								).map((day) => (
									<SelectItem
										key={day}
										value={String(day)}
										className="min-h-12 px-3 pr-10 text-base"
									>
										{messages.subscription.dayOption({ day })}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.billingDay ? <FieldError>{errors.billingDay}</FieldError> : null}
					</Field>
					<Field data-invalid={Boolean(errors.categoryId)}>
						<FieldLabel htmlFor="subscription-category">
							{messages.subscription.category()}
						</FieldLabel>
						<Select
							items={categoryItems}
							value={values.categoryId || "uncategorized"}
							onValueChange={(value) =>
								updateField("categoryId", value === "uncategorized" ? "" : (value ?? ""))
							}
						>
							<SelectTrigger
								id="subscription-category"
								className="data-[size=default]:h-14 w-full rounded-xl bg-white px-4 text-base"
							>
								<SelectValue>
									{(value: string | null) => {
										const category = categories.find((item) => item.id === value)
										return (
											<span className="flex items-center gap-2">
												<CategoryIcon iconName={category?.iconName ?? "circle-help"} compact />
												{category
													? categoryDisplayName(category)
													: messages.monthly.uncategorized()}
											</span>
										)
									}}
								</SelectValue>
							</SelectTrigger>
							<SelectContent align="start" className="p-1.5">
								<SelectItem value="uncategorized" className="min-h-12 px-3 pr-10 text-base">
									<span className="flex items-center gap-3">
										<CategoryIcon iconName="circle-help" compact />
										{messages.monthly.uncategorized()}
									</span>
								</SelectItem>
								{categories.map((category) => (
									<SelectItem
										key={category.id}
										value={category.id}
										className="min-h-12 px-3 pr-10 text-base"
									>
										<span className="flex items-center gap-3">
											<CategoryIcon iconName={category.iconName} compact />
											{categoryDisplayName(category)}
										</span>
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						{errors.categoryId ? <FieldError>{errors.categoryId}</FieldError> : null}
					</Field>

					<Field>
						<FieldLabel htmlFor="subscription-holiday">
							{messages.subscription.adjustment()}
						</FieldLabel>
						<Select
							value={values.holidayAdjustment}
							onValueChange={(value) => {
								if (value === "none" || value === "previous" || value === "next")
									updateField("holidayAdjustment", value)
							}}
						>
							<SelectTrigger
								id="subscription-holiday"
								className="data-[size=default]:h-14 w-full rounded-xl bg-white px-4 text-base"
							>
								<SelectValue>
									{() =>
										values.holidayAdjustment === "previous"
											? messages.subscription.previous()
											: values.holidayAdjustment === "next"
												? messages.subscription.next()
												: messages.subscription.none()
									}
								</SelectValue>
							</SelectTrigger>
							<SelectContent align="start" className="p-1.5">
								<SelectItem value="none" className="min-h-12 px-3 pr-10 text-base">
									{messages.subscription.none()}
								</SelectItem>
								<SelectItem value="previous" className="min-h-12 px-3 pr-10 text-base">
									{messages.subscription.previous()}
								</SelectItem>
								<SelectItem value="next" className="min-h-12 px-3 pr-10 text-base">
									{messages.subscription.next()}
								</SelectItem>
							</SelectContent>
						</Select>
					</Field>
					{save.isError ? (
						<p role="alert" className="text-sm text-destructive">
							{save.error.message}
						</p>
					) : null}
					<p className="app-text-muted text-sm">{messages.subscription.autoPostingNote()}</p>
					<Button
						type="submit"
						size="lg"
						disabled={save.isPending}
						className="h-14 w-full rounded-xl bg-[var(--budget-primary)] text-base font-semibold text-white active:brightness-90"
					>
						{messages.subscription.save()}
					</Button>
				</FieldGroup>
			</form>
			{subscription ? (
				<div className="mt-10 border-t pt-6">
					<Button
						type="button"
						variant="outline"
						disabled={save.isPending}
						className="min-h-11 w-full rounded-xl border-destructive text-destructive active:bg-destructive/5 active:text-destructive"
						onClick={() => {
							deletion.reset()
							setDeleteOpen(true)
						}}
					>
						<Trash2 aria-hidden="true" />
						{messages.expenses.delete()}
					</Button>
				</div>
			) : null}
			<DeleteConfirmationDialog
				open={deleteOpen}
				onOpenChange={setDeleteOpen}
				title={messages.subscription.deleteConfirm()}
				description={messages.subscription.deleteDescription()}
				error={deletion.error}
				isPending={deletion.isPending}
				onConfirm={() => deletion.mutate()}
			/>
		</>
	)
}
