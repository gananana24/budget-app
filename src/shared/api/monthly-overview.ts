export type MonthlyOverviewResponse = Readonly<{
	month: string
	totals: Readonly<{ expenses: number }>
	uncategorized: Readonly<{ expenses: number }>
	categories: readonly Readonly<{
		id: string
		name: string
		seedKey: string | null
		iconName: string
		expenses: number
	}>[]
	expenses: readonly Readonly<{
		id: string
		date: string
		amount: number
		categoryId: string | null
		memo: string | null
		createdAt: string
		updatedAt: string
		sourceSubscriptionId?: string | null
		sourceSubscriptionActive?: boolean
	}>[]
}>
