import { hc, type InferRequestType, type InferResponseType } from "hono/client"
import { expectTypeOf, it } from "vitest"
import type { AppType } from "../../backend/presentation/http/app"
import type { CreatedExpense } from "../../backend/usecase/expense/create-expense-use-case"
import type { CategoryWriteRequest } from "../../shared/api/category"
import type { CreateExpenseRequest } from "../../shared/api/create-expense"
import type { deleteExpense, updateExpense } from "../features/expenses/api/change-expense"
import type { createExpense } from "../features/expenses/api/create-expense"
import type { MonthlyOverview } from "../features/monthly/api/monthly-overview"
import type { Category } from "../features/settings/api/categories"

it("exposes the expense contract to the Hono RPC client", () => {
	// Arrange
	const client = hc<AppType>("http://localhost")

	// Act
	type RequestBody = InferRequestType<typeof client.api.expenses.$post>["json"]
	type ResponseBody = InferResponseType<typeof client.api.expenses.$post, 201>

	// Assert
	expectTypeOf<RequestBody>().toExtend<CreateExpenseRequest>()
	expectTypeOf<ResponseBody>().toEqualTypeOf<CreatedExpense>()
	expectTypeOf<Awaited<ReturnType<typeof createExpense>>>().toEqualTypeOf<ResponseBody>()
})

it("exposes category requests and responses through the RPC contract", () => {
	// Arrange
	const client = hc<AppType>("http://localhost")

	// Act
	type CreateRequest = InferRequestType<typeof client.api.categories.$post>
	type UpdateRequest = InferRequestType<(typeof client.api.categories)[":categoryId"]["$patch"]>
	type ListResponse = InferResponseType<typeof client.api.categories.$get, 200>

	// Assert
	expectTypeOf<CreateRequest["json"]>().toExtend<CategoryWriteRequest>()
	expectTypeOf<UpdateRequest["json"]>().toExtend<CategoryWriteRequest>()
	expectTypeOf<UpdateRequest["param"]>().toEqualTypeOf<{ categoryId: string }>()
	expectTypeOf<ListResponse["categories"][number]>().toEqualTypeOf<Category>()
})

it("exposes the monthly overview response through the RPC contract", () => {
	// Arrange
	const client = hc<AppType>("http://localhost")

	// Act
	type Request = InferRequestType<(typeof client.api.months)[":month"]["$get"]>
	type Response = InferResponseType<(typeof client.api.months)[":month"]["$get"], 200>

	// Assert
	expectTypeOf<Request["param"]>().toEqualTypeOf<{ month: string }>()
	expectTypeOf<Response>().toEqualTypeOf<MonthlyOverview>()
})

it("exposes the expense change contract to the Hono RPC client", () => {
	// Arrange
	const client = hc<AppType>("http://localhost")

	// Act
	type UpdateRequest = InferRequestType<(typeof client.api.expenses)[":expenseId"]["$patch"]>
	type UpdateResponse = InferResponseType<(typeof client.api.expenses)[":expenseId"]["$patch"], 200>
	type DeleteRequest = InferRequestType<(typeof client.api.expenses)[":expenseId"]["$delete"]>

	// Assert
	expectTypeOf<UpdateRequest["json"]>().toExtend<CreateExpenseRequest>()
	expectTypeOf<UpdateRequest["param"]>().toEqualTypeOf<{ expenseId: string }>()
	expectTypeOf<UpdateResponse>().toEqualTypeOf<CreatedExpense>()
	expectTypeOf<DeleteRequest["param"]>().toEqualTypeOf<{ expenseId: string }>()
	expectTypeOf<Awaited<ReturnType<typeof updateExpense>>>().toEqualTypeOf<UpdateResponse>()
	expectTypeOf<Awaited<ReturnType<typeof deleteExpense>>>().toEqualTypeOf<void>()
})
