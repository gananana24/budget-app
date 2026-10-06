import { ExpenseId } from "../../domain/expense/value-objects/expense-id"
import type { ResolveAuthorizationUseCase } from "../../usecase/authorization/resolve-authorization-use-case"
import { DefaultResolveAuthorizationUseCase } from "../../usecase/authorization/resolve-authorization-use-case"
import type { BootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import { DefaultBootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import type { CreateExpenseUseCase } from "../../usecase/expense/create-expense-use-case"
import { DefaultCreateExpenseUseCase } from "../../usecase/expense/create-expense-use-case"
import type { DeleteExpenseUseCase } from "../../usecase/expense/delete-expense-use-case"
import { DefaultDeleteExpenseUseCase } from "../../usecase/expense/delete-expense-use-case"
import type { UpdateExpenseUseCase } from "../../usecase/expense/update-expense-use-case"
import { DefaultUpdateExpenseUseCase } from "../../usecase/expense/update-expense-use-case"
import type { GetMonthlyOverviewUseCase } from "../../usecase/monthly/get-monthly-overview-use-case"
import { DefaultGetMonthlyOverviewUseCase } from "../../usecase/monthly/get-monthly-overview-use-case"
import { PostgresBudgetPeriodRepository } from "../postgres/budget/postgres-budget-period-repository"
import {
	withPostgresClient,
	withPostgresReadTransaction,
	withPostgresTransaction,
} from "../postgres/database"
import { PostgresExpenseRepository } from "../postgres/expense/postgres-expense-repository"
import { PostgresHouseholdMembershipRepository } from "../postgres/household/postgres-household-membership-repository"
import { PostgresHouseholdRepository } from "../postgres/household/postgres-household-repository"
import { PostgresMonthlyOverviewRepository } from "../postgres/monthly/postgres-monthly-overview-repository"
import { PostgresUserRepository } from "../postgres/user/postgres-user-repository"

type DatabaseEnv = Pick<Env, "DATABASE">

export type WorkerDependencies = Readonly<{
	bootstrapUseCase: BootstrapUseCase
	resolveAuthorizationUseCase: ResolveAuthorizationUseCase
	createExpenseUseCase: CreateExpenseUseCase
	updateExpenseUseCase: UpdateExpenseUseCase
	deleteExpenseUseCase: DeleteExpenseUseCase
	getMonthlyOverviewUseCase: GetMonthlyOverviewUseCase
}>

export function newWorkerDependencies(env: DatabaseEnv): WorkerDependencies {
	const connectionString = env.DATABASE.connectionString

	return {
		bootstrapUseCase: {
			execute: (clerkUserId) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultBootstrapUseCase({
						userRepository: new PostgresUserRepository(client),
						householdRepository: new PostgresHouseholdRepository(client),
						householdMembershipRepository: new PostgresHouseholdMembershipRepository(client),
						budgetPeriodRepository: new PostgresBudgetPeriodRepository(client),
						now: () => new Date(),
					}).execute(clerkUserId),
				),
		},
		resolveAuthorizationUseCase: {
			execute: (clerkUserId) =>
				withPostgresClient(connectionString, (client) =>
					new DefaultResolveAuthorizationUseCase({
						userRepository: new PostgresUserRepository(client),
						householdRepository: new PostgresHouseholdRepository(client),
					}).execute(clerkUserId),
				),
		},
		createExpenseUseCase: {
			execute: (input) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultCreateExpenseUseCase({
						expenseRepository: new PostgresExpenseRepository(client),
						newExpenseId: ExpenseId.generate,
						now: () => new Date(),
					}).execute(input),
				),
		},
		updateExpenseUseCase: {
			execute: (input) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultUpdateExpenseUseCase(
						new PostgresExpenseRepository(client),
						() => new Date(),
					).execute(input),
				),
		},
		deleteExpenseUseCase: {
			execute: (input) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultDeleteExpenseUseCase(new PostgresExpenseRepository(client)).execute(input),
				),
		},
		getMonthlyOverviewUseCase: {
			execute: (input) =>
				withPostgresReadTransaction(connectionString, (client) =>
					new DefaultGetMonthlyOverviewUseCase({
						monthlyOverviewRepository: new PostgresMonthlyOverviewRepository(client),
						now: () => new Date(),
					}).execute(input),
				),
		},
	}
}
