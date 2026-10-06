const MAX_EXPENSE_AMOUNT = 2_147_483_647

export type ExpenseFormValues = Readonly<{
	date: string
	amount: string
	categoryId: string
	memo: string
}>

export type ExpenseFormField = keyof ExpenseFormValues
export type ExpenseFormErrors = Partial<Record<ExpenseFormField, "invalid">>

function isRealIsoDate(value: string): boolean {
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
	if (!match) {
		return false
	}

	const year = Number(match[1])
	const month = Number(match[2])
	const day = Number(match[3])
	return (
		year >= 1 &&
		month >= 1 &&
		month <= 12 &&
		day >= 1 &&
		day <= new Date(Date.UTC(year, month, 0)).getUTCDate()
	)
}

export function validateExpenseForm(
	values: ExpenseFormValues,
	todayInTokyo: string,
	availableCategoryIds: ReadonlySet<string>,
): ExpenseFormErrors {
	const amount = Number(values.amount)
	return {
		...(!isRealIsoDate(values.date) || values.date > todayInTokyo
			? { date: "invalid" as const }
			: {}),
		...(!/^\d+$/.test(values.amount) ||
		!Number.isSafeInteger(amount) ||
		amount < 1 ||
		amount > MAX_EXPENSE_AMOUNT
			? { amount: "invalid" as const }
			: {}),
		...(values.categoryId !== "" && !availableCategoryIds.has(values.categoryId)
			? { categoryId: "invalid" as const }
			: {}),
		...([...values.memo.trim()].length > 500 ? { memo: "invalid" as const } : {}),
	}
}
