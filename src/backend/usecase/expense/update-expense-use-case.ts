import { Expense } from "../../domain/expense/entities/expense"
import { ExpenseNotFoundError } from "../../domain/expense/exceptions/expense-not-found-error"
import type { ExpenseRepository } from "../../domain/expense/repositories/expense-repository"
import { ExpenseId } from "../../domain/expense/value-objects/expense-id"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { getDateInTokyo } from "../../domain/shared/services/tokyo-calendar"
import type { CreatedExpense } from "./create-expense-use-case"

export type UpdateExpenseInput = Readonly<{
	authorization: AuthorizationContext
	expenseId: unknown
	date: unknown
	amount: unknown
	categoryId: unknown
	memo: unknown
}>

export interface UpdateExpenseUseCase {
	execute(input: UpdateExpenseInput): Promise<CreatedExpense>
}

export class DefaultUpdateExpenseUseCase implements UpdateExpenseUseCase {
	constructor(
		private readonly expenseRepository: ExpenseRepository,
		private readonly now: () => Date,
	) {}

	async execute(input: UpdateExpenseInput): Promise<CreatedExpense> {
		const expense = Expense.create({
			id: ExpenseId.from(input.expenseId),
			householdId: input.authorization.householdId,
			categoryId: input.categoryId,
			date: input.date,
			amount: input.amount,
			memo: input.memo,
			todayInTokyo: getDateInTokyo(this.now()),
		})
		if (!(await this.expenseRepository.update(expense))) {
			throw new ExpenseNotFoundError()
		}

		return {
			id: expense.id.value,
			date: expense.date,
			amount: expense.amount,
			categoryId: expense.categoryId?.value ?? null,
			memo: expense.memo,
		}
	}
}
