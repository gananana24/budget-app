import * as z from "zod"

export const categoryWriteRequestSchema = z.object({
	name: z.string(),
	iconName: z.string(),
})

export type CategoryWriteRequest = Readonly<z.infer<typeof categoryWriteRequestSchema>>
