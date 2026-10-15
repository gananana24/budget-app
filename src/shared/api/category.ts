import * as z from "zod"

export const categoryWriteRequestSchema = z.object({
	name: z.string(),
	iconName: z.string(),
})

export type CategoryWriteRequest = Readonly<z.infer<typeof categoryWriteRequestSchema>>

export type CategoryResponse = Readonly<{
	id: string
	name: string
	iconName: string
	isInitial: boolean
	seedKey: string | null
}>

export type CategoriesResponse = Readonly<{ categories: readonly CategoryResponse[] }>
