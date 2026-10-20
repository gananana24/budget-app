import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { SubscriptionNotFoundError } from "../../../domain/subscription/subscription-not-found-error"
import { MonthStart } from "../../../domain/monthly/value-objects/month-start"
import { ClerkUserId } from "../../../domain/user/value-objects/clerk-user-id"
import { DefaultBootstrapUseCase } from "../../../usecase/bootstrap/bootstrap-use-case"
import { DefaultPostDueSubscriptionUseCase } from "../../../usecase/subscription/post-due-subscriptions-use-case"
import { DefaultCreateCategoryUseCase } from "../../../usecase/category/create-category-use-case"
import { DefaultDeleteCategoryUseCase } from "../../../usecase/category/delete-category-use-case"
import {
	DefaultCreateSubscriptionUseCase,
	DefaultEndSubscriptionUseCase,
	DefaultListSubscriptionsUseCase,
	DefaultUpdateSubscriptionUseCase,
} from "../../../usecase/subscription/subscription-use-cases"
import { withPostgresClient, withPostgresTransaction } from "../database"
import { PostgresCategoryRepository } from "../category/postgres-category-repository"
import { PostgresHouseholdMembershipRepository } from "../household/postgres-household-membership-repository"
import { PostgresHouseholdRepository } from "../household/postgres-household-repository"
import { PostgresMonthlyOverviewRepository } from "../monthly/postgres-monthly-overview-repository"
import { PostgresUserRepository } from "../user/postgres-user-repository"
import { PostgresSubscriptionRepository } from "./postgres-subscription-repository"

const DATABASE_URL =
	process.env.TEST_DATABASE_URL ??
	"postgresql://postgres:postgres@127.0.0.1:54322/budget_app_test?sslmode=disable"
if (!new URL(DATABASE_URL).pathname.slice(1).endsWith("_test"))
	throw new Error("A dedicated test database is required")
const now = () => new Date("2026-10-19T00:00:00Z")

async function bootstrap(clerkUserId: string) {
	return withPostgresTransaction(DATABASE_URL, (client) =>
		new DefaultBootstrapUseCase({
			userRepository: new PostgresUserRepository(client),
			householdRepository: new PostgresHouseholdRepository(client),
			householdMembershipRepository: new PostgresHouseholdMembershipRepository(client),
		}).execute(ClerkUserId.from(clerkUserId)),
	)
}

const details = {
	name: "ジム会費",
	amount: 6000,
	categoryId: null,
	intervalUnit: "month",
	billingMonth: null,
	billingDay: 27,
	holidayAdjustment: "next",
} as const

function updateUseCase(client: Client, clock = now) {
	const repository = new PostgresSubscriptionRepository(client)
	return new DefaultUpdateSubscriptionUseCase(
		repository,
		clock,
		new DefaultPostDueSubscriptionUseCase(repository, () => crypto.randomUUID()),
	)
}

function endUseCase(client: Client, clock = now) {
	const repository = new PostgresSubscriptionRepository(client)
	return new DefaultEndSubscriptionUseCase(
		repository,
		new DefaultPostDueSubscriptionUseCase(repository, () => crypto.randomUUID()),
		clock,
	)
}

async function postDue(today: string): Promise<void> {
	const ids = await withPostgresClient(DATABASE_URL, (client) =>
		new PostgresSubscriptionRepository(client).findActiveIds(),
	)
	for (const id of ids) {
		await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultPostDueSubscriptionUseCase(new PostgresSubscriptionRepository(client), () =>
				crypto.randomUUID(),
			).execute(id, today),
		)
	}
}

describe("subscriptions with PostgreSQL", () => {
	const inspector = new Client({ connectionString: DATABASE_URL })
	beforeAll(async () => {
		await inspector.connect()
		await inspector.query("SELECT pg_advisory_lock(742001)")
	})
	beforeEach(async () => {
		await inspector.query("DELETE FROM public.households")
		await inspector.query("DELETE FROM public.users")
	})
	afterAll(async () => {
		await inspector.query("SELECT pg_advisory_unlock(742001)")
		await inspector.end()
	})

	it("shows only the owner's active commitments and excludes an ended one", async () => {
		// Arrange
		const owner = await bootstrap("clerk_subscription_owner")
		const other = await bootstrap("clerk_subscription_other")
		const created = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateSubscriptionUseCase(new PostgresSubscriptionRepository(client), now, () =>
				crypto.randomUUID(),
			).execute({ authorization: owner, details }),
		)

		// Act
		const otherList = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultListSubscriptionsUseCase(new PostgresSubscriptionRepository(client), now).execute(
				other,
			),
		)
		await withPostgresTransaction(DATABASE_URL, (client) =>
			endUseCase(client).execute({
				authorization: owner,
				id: created.id,
			}),
		)
		const ownerList = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultListSubscriptionsUseCase(new PostgresSubscriptionRepository(client), now).execute(
				owner,
			),
		)

		// Assert
		expect(created.monthlyAmount).toBe(6000)
		expect(otherList.subscriptions).toEqual([])
		expect(ownerList).toEqual({ subscriptions: [], monthlyTotal: 0 })
	})

	it("returns the same unavailable result for another household's ID", async () => {
		// Arrange
		const owner = await bootstrap("clerk_subscription_access_owner")
		const other = await bootstrap("clerk_subscription_access_other")
		const created = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateSubscriptionUseCase(new PostgresSubscriptionRepository(client), now, () =>
				crypto.randomUUID(),
			).execute({ authorization: owner, details }),
		)

		// Act
		const results = await Promise.allSettled([
			withPostgresTransaction(DATABASE_URL, (client) =>
				updateUseCase(client).execute({ authorization: other, id: created.id, details }),
			),
			withPostgresTransaction(DATABASE_URL, (client) =>
				endUseCase(client).execute({
					authorization: other,
					id: created.id,
				}),
			),
		])

		// Assert
		expect(
			results.every(
				(result) =>
					result.status === "rejected" && result.reason instanceof SubscriptionNotFoundError,
			),
		).toBe(true)
	})

	it("rejects a category from another household at the database boundary", async () => {
		// Arrange
		const owner = await bootstrap("clerk_subscription_category_owner")
		const other = await bootstrap("clerk_subscription_category_other")
		const category = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: other,
				name: "他人の分類",
				iconName: "tag",
			}),
		)

		// Act
		const result = withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateSubscriptionUseCase(new PostgresSubscriptionRepository(client), now, () =>
				crypto.randomUUID(),
			).execute({ authorization: owner, details: { ...details, categoryId: category.id } }),
		)

		// Assert
		await expect(result).rejects.toBeInstanceOf(SubscriptionNotFoundError)
	})

	it("keeps a subscription after its custom category is deleted", async () => {
		// Arrange
		const owner = await bootstrap("clerk_subscription_deleted_category_owner")
		const category = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: owner,
				name: "会費",
				iconName: "tag",
			}),
		)
		const created = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateSubscriptionUseCase(new PostgresSubscriptionRepository(client), now, () =>
				crypto.randomUUID(),
			).execute({ authorization: owner, details: { ...details, categoryId: category.id } }),
		)

		// Act
		await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultDeleteCategoryUseCase(new PostgresCategoryRepository(client)).execute({
				authorization: owner,
				categoryId: category.id,
			}),
		)
		const result = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultListSubscriptionsUseCase(new PostgresSubscriptionRepository(client), now).execute(
				owner,
			),
		)

		// Assert
		expect(result.subscriptions).toEqual([
			expect.objectContaining({ id: created.id, categoryId: null }),
		])
		expect(result.monthlyTotal).toBe(6000)
	})

	it("posts missed payment dates once even after one generated expense is deleted", async () => {
		// Arrange
		const owner = await bootstrap("clerk_subscription_post_owner")
		await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateSubscriptionUseCase(new PostgresSubscriptionRepository(client), now, () =>
				crypto.randomUUID(),
			).execute({ authorization: owner, details }),
		)

		// Act
		await Promise.all([postDue("2026-12-29"), postDue("2026-12-29")])
		const december = await withPostgresClient(DATABASE_URL, (client) =>
			new PostgresMonthlyOverviewRepository(client).findByMonth(
				owner.householdId,
				MonthStart.from("2026-12-01"),
			),
		)
		const first = await inspector.query(
			"SELECT id::text AS id, expense_date::text AS date, amount, memo FROM public.expenses WHERE household_id=$1 ORDER BY expense_date",
			[owner.householdId.value],
		)
		await inspector.query("DELETE FROM public.expenses WHERE id=$1::uuid", [first.rows[1].id])
		await postDue("2026-12-29")
		const remaining = await inspector.query(
			"SELECT expense_date::text AS date FROM public.expenses WHERE household_id=$1 ORDER BY expense_date",
			[owner.householdId.value],
		)
		const occurrences = await inspector.query(
			"SELECT payment_date::text AS date, expense_id::text AS expense_id FROM public.subscription_occurrences WHERE household_id=$1 ORDER BY payment_date",
			[owner.householdId.value],
		)

		// Assert
		expect(first.rows.map(({ date, amount, memo }) => ({ date, amount, memo }))).toEqual([
			{ date: "2026-10-27", amount: 6000, memo: "ジム会費" },
			{ date: "2026-11-27", amount: 6000, memo: "ジム会費" },
			{ date: "2026-12-28", amount: 6000, memo: "ジム会費" },
		])
		expect(remaining.rows.map((row) => row.date)).toEqual(["2026-10-27", "2026-12-28"])
		expect(occurrences.rows).toHaveLength(3)
		expect(occurrences.rows[1].expense_id).toBeNull()
		expect(december.totalExpenseAmount).toBe(6000)
		expect(december.expenses[0]).toEqual(
			expect.objectContaining({ sourceSubscriptionActive: true }),
		)
	})

	it("applies edits to future occurrences and stops after deletion", async () => {
		// Arrange
		const owner = await bootstrap("clerk_subscription_post_edit_owner")
		const created = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateSubscriptionUseCase(new PostgresSubscriptionRepository(client), now, () =>
				crypto.randomUUID(),
			).execute({ authorization: owner, details }),
		)
		await postDue("2026-10-27")

		// Act
		await withPostgresTransaction(DATABASE_URL, (client) =>
			updateUseCase(client, () => new Date("2026-10-27T03:00:00Z")).execute({
				authorization: owner,
				id: created.id,
				details: { ...details, amount: 7000 },
			}),
		)
		await postDue("2026-11-27")
		await withPostgresTransaction(DATABASE_URL, (client) =>
			endUseCase(client, () => new Date("2026-11-27T03:00:00Z")).execute({
				authorization: owner,
				id: created.id,
			}),
		)
		await postDue("2026-12-29")
		const expenses = await inspector.query(
			"SELECT expense_date::text AS date, amount FROM public.expenses WHERE household_id=$1 ORDER BY expense_date",
			[owner.householdId.value],
		)
		const october = await withPostgresClient(DATABASE_URL, (client) =>
			new PostgresMonthlyOverviewRepository(client).findByMonth(
				owner.householdId,
				MonthStart.from("2026-10-01"),
			),
		)

		// Assert
		expect(expenses.rows).toEqual([
			{ date: "2026-10-27", amount: 6000 },
			{ date: "2026-11-27", amount: 7000 },
		])
		expect(october.expenses[0]).toEqual(
			expect.objectContaining({
				sourceSubscriptionId: created.id,
				sourceSubscriptionActive: false,
			}),
		)
	})

	it("preserves missed payments when a subscription is edited and then deleted", async () => {
		// Arrange
		const owner = await bootstrap("clerk_subscription_post_backlog_owner")
		const created = await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateSubscriptionUseCase(new PostgresSubscriptionRepository(client), now, () =>
				crypto.randomUUID(),
			).execute({ authorization: owner, details }),
		)

		// Act
		await withPostgresTransaction(DATABASE_URL, (client) =>
			updateUseCase(client, () => new Date("2026-11-28T03:00:00Z")).execute({
				authorization: owner,
				id: created.id,
				details: { ...details, amount: 7000 },
			}),
		)
		await withPostgresTransaction(DATABASE_URL, (client) =>
			endUseCase(client, () => new Date("2026-12-29T03:00:00Z")).execute({
				authorization: owner,
				id: created.id,
			}),
		)
		const expenses = await inspector.query(
			"SELECT expense_date::text AS date, amount FROM public.expenses WHERE household_id=$1 ORDER BY expense_date",
			[owner.householdId.value],
		)

		// Assert
		expect(expenses.rows).toEqual([
			{ date: "2026-10-27", amount: 6000 },
			{ date: "2026-11-27", amount: 6000 },
			{ date: "2026-12-28", amount: 7000 },
		])
	})

	it("posts annual leap-day payments only in the owning household", async () => {
		// Arrange
		const owner = await bootstrap("clerk_subscription_annual_owner")
		const other = await bootstrap("clerk_subscription_annual_other")
		await withPostgresTransaction(DATABASE_URL, (client) =>
			new DefaultCreateSubscriptionUseCase(
				new PostgresSubscriptionRepository(client),
				() => new Date("2026-01-01T03:00:00Z"),
				() => crypto.randomUUID(),
			).execute({
				authorization: owner,
				details: {
					...details,
					name: "年払い",
					amount: 12000,
					intervalUnit: "year",
					billingMonth: 2,
					billingDay: 29,
					holidayAdjustment: "none",
				},
			}),
		)

		// Act
		await postDue("2028-03-01")
		const ownerExpenses = await inspector.query(
			"SELECT expense_date::text AS date, amount FROM public.expenses WHERE household_id=$1 ORDER BY expense_date",
			[owner.householdId.value],
		)
		const otherExpenses = await inspector.query(
			"SELECT id FROM public.expenses WHERE household_id=$1",
			[other.householdId.value],
		)

		// Assert
		expect(ownerExpenses.rows).toEqual([
			{ date: "2026-02-28", amount: 12000 },
			{ date: "2027-02-28", amount: 12000 },
			{ date: "2028-02-29", amount: 12000 },
		])
		expect(otherExpenses.rows).toEqual([])
	})
})
