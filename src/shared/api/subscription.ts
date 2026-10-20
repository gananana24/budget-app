import { z } from "zod"

export const subscriptionWriteSchema = z.object({
	name: z.string(),
	amount: z.number(),
	categoryId: z.string().nullable(),
	intervalUnit: z.enum(["month", "year"]),
	billingMonth: z.number().nullable(),
	billingDay: z.number(),
	holidayAdjustment: z.enum(["none", "previous", "next"]),
})

export type SubscriptionWrite = z.infer<typeof subscriptionWriteSchema>
export type SubscriptionResponse = SubscriptionWrite &
	Readonly<{
		id: string
		nextPaymentDate: string
		monthlyAmount: number
	}>
export type SubscriptionsResponse = Readonly<{
	subscriptions: readonly SubscriptionResponse[]
	monthlyTotal: number
}>
