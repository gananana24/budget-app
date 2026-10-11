import { ExpenseId } from "../../domain/expense/value-objects/expense-id"
import type { ResolveAuthorizationUseCase } from "../../usecase/authorization/resolve-authorization-use-case"
import { DefaultResolveAuthorizationUseCase } from "../../usecase/authorization/resolve-authorization-use-case"
import type { BootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import { DefaultBootstrapUseCase } from "../../usecase/bootstrap/bootstrap-use-case"
import type { DeleteMonthlyBudgetUseCase } from "../../usecase/budget/delete-monthly-budget-use-case"
import { DefaultDeleteMonthlyBudgetUseCase } from "../../usecase/budget/delete-monthly-budget-use-case"
import type { GetBudgetDraftUseCase } from "../../usecase/budget/get-budget-draft-use-case"
import { DefaultGetBudgetDraftUseCase } from "../../usecase/budget/get-budget-draft-use-case"
import type { SaveMonthlyBudgetsUseCase } from "../../usecase/budget/save-monthly-budgets-use-case"
import { DefaultSaveMonthlyBudgetsUseCase } from "../../usecase/budget/save-monthly-budgets-use-case"
import type { CreateCategoryUseCase } from "../../usecase/category/create-category-use-case"
import { DefaultCreateCategoryUseCase } from "../../usecase/category/create-category-use-case"
import type { DeleteCategoryUseCase } from "../../usecase/category/delete-category-use-case"
import { DefaultDeleteCategoryUseCase } from "../../usecase/category/delete-category-use-case"
import type { ListCategoriesUseCase } from "../../usecase/category/list-categories-use-case"
import { DefaultListCategoriesUseCase } from "../../usecase/category/list-categories-use-case"
import type { UpdateCategoryUseCase } from "../../usecase/category/update-category-use-case"
import { DefaultUpdateCategoryUseCase } from "../../usecase/category/update-category-use-case"
import type { CreateExpenseUseCase } from "../../usecase/expense/create-expense-use-case"
import { DefaultCreateExpenseUseCase } from "../../usecase/expense/create-expense-use-case"
import type { DeleteExpenseUseCase } from "../../usecase/expense/delete-expense-use-case"
import { DefaultDeleteExpenseUseCase } from "../../usecase/expense/delete-expense-use-case"
import type { UpdateExpenseUseCase } from "../../usecase/expense/update-expense-use-case"
import { DefaultUpdateExpenseUseCase } from "../../usecase/expense/update-expense-use-case"
import type { GetMonthlyOverviewUseCase } from "../../usecase/monthly/get-monthly-overview-use-case"
import { DefaultGetMonthlyOverviewUseCase } from "../../usecase/monthly/get-monthly-overview-use-case"
import { PostgresBudgetPeriodRepository } from "../postgres/budget/postgres-budget-period-repository"
import { PostgresMonthlyBudgetRepository } from "../postgres/budget/postgres-monthly-budget-repository"
import { PostgresCategoryRepository } from "../postgres/category/postgres-category-repository"
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
	listCategoriesUseCase: ListCategoriesUseCase
	createCategoryUseCase: CreateCategoryUseCase
	updateCategoryUseCase: UpdateCategoryUseCase
	deleteCategoryUseCase: DeleteCategoryUseCase
	getBudgetDraftUseCase: GetBudgetDraftUseCase
	saveMonthlyBudgetsUseCase: SaveMonthlyBudgetsUseCase
	deleteMonthlyBudgetUseCase: DeleteMonthlyBudgetUseCase
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
		listCategoriesUseCase: {
			execute: (authorization) =>
				withPostgresClient(connectionString, (client) =>
					new DefaultListCategoriesUseCase(new PostgresCategoryRepository(client)).execute(
						authorization,
					),
				),
		},
		createCategoryUseCase: {
			execute: (input) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute(input),
				),
		},
		updateCategoryUseCase: {
			execute: (input) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultUpdateCategoryUseCase(new PostgresCategoryRepository(client)).execute(input),
				),
		},
		deleteCategoryUseCase: {
			execute: (input) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultDeleteCategoryUseCase(new PostgresCategoryRepository(client)).execute(input),
				),
		},
		getBudgetDraftUseCase: {
			execute: (input) =>
				withPostgresReadTransaction(connectionString, (client) =>
					new DefaultGetBudgetDraftUseCase(
						new PostgresMonthlyBudgetRepository(client),
						() => new Date(),
					).execute(input),
				),
		},
		saveMonthlyBudgetsUseCase: {
			execute: (input) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultSaveMonthlyBudgetsUseCase(
						new PostgresMonthlyBudgetRepository(client),
						() => new Date(),
					).execute(input),
				),
		},
		deleteMonthlyBudgetUseCase: {
			execute: (input) =>
				withPostgresTransaction(connectionString, (client) =>
					new DefaultDeleteMonthlyBudgetUseCase(
						new PostgresMonthlyBudgetRepository(client),
						() => new Date(),
					).execute(input),
				),
		},
	}
}
