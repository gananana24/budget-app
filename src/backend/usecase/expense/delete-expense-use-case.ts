import { ExpenseNotFoundError } from "../../domain/expense/exceptions/expense-not-found-error"
import type { ExpenseRepository } from "../../domain/expense/repositories/expense-repository"
import { ExpenseId } from "../../domain/expense/value-objects/expense-id"
import type { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"

export interface DeleteExpenseUseCase {
	execute(
		input: Readonly<{ authorization: AuthorizationContext; expenseId: unknown }>,
	): Promise<void>
}

export class DefaultDeleteExpenseUseCase implements DeleteExpenseUseCase {
	constructor(private readonly expenseRepository: ExpenseRepository) {}

	async execute(
		input: Readonly<{ authorization: AuthorizationContext; expenseId: unknown }>,
	): Promise<void> {
		const deleted = await this.expenseRepository.delete(
			input.authorization.householdId,
			ExpenseId.from(input.expenseId),
		)
		if (!deleted) {
			throw new ExpenseNotFoundError()
		}
	}
}
