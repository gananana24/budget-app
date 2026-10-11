import * as z from "zod"

export const createExpenseRequestSchema = z.object({
	date: z.string(),
	amount: z.number(),
	categoryId: z.string().nullable().optional(),
	memo: z.string().nullable().optional(),
})

export type CreateExpenseRequest = Readonly<z.infer<typeof createExpenseRequestSchema>>
