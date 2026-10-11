const MAX_BUDGET_AMOUNT = 2_147_483_647

export function parseBudgetAmount(value: string): number | null {
	if (!/^\d+$/.test(value)) return null
	const amount = Number(value)
	return Number.isSafeInteger(amount) && amount <= MAX_BUDGET_AMOUNT ? amount : null
}
