import { Expense } from "../../domain/expense/entities/expense"
import type { ExpenseRepository } from "../../domain/expense/repositories/expense-repository"
import type { ExpenseId } from "../../domain/expense/value-objects/expense-id"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { getDateInTokyo } from "../../domain/shared/services/tokyo-calendar"

export type CreateExpenseInput = Readonly<{
	authorization: AuthorizationContext
	date: unknown
	amount: unknown
	categoryId: unknown
	memo: unknown
}>

export type CreatedExpense = Readonly<{
	id: string
	date: string
	amount: number
	categoryId: string | null
	memo: string | null
}>

export interface CreateExpenseUseCase {
	execute(input: CreateExpenseInput): Promise<CreatedExpense>
}

type CreateExpenseUseCaseDependencies = Readonly<{
	expenseRepository: ExpenseRepository
	newExpenseId: () => ExpenseId
	now: () => Date
}>

export class DefaultCreateExpenseUseCase implements CreateExpenseUseCase {
	constructor(private readonly dependencies: CreateExpenseUseCaseDependencies) {}

	async execute(input: CreateExpenseInput): Promise<CreatedExpense> {
		const expense = Expense.create({
			id: this.dependencies.newExpenseId(),
			householdId: input.authorization.householdId,
			categoryId: input.categoryId,
			date: input.date,
			amount: input.amount,
			memo: input.memo,
			todayInTokyo: getDateInTokyo(this.dependencies.now()),
		})
		await this.dependencies.expenseRepository.save(expense)

		return {
			id: expense.id.value,
			date: expense.date,
			amount: expense.amount,
			categoryId: expense.categoryId?.value ?? null,
			memo: expense.memo,
		}
	}
}
