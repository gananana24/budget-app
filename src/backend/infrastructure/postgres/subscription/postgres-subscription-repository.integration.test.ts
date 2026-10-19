import { Client } from "pg"
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest"
import { SubscriptionNotFoundError } from "../../../domain/subscription/subscription-not-found-error"
import { ClerkUserId } from "../../../domain/user/value-objects/clerk-user-id"
import { DefaultBootstrapUseCase } from "../../../usecase/bootstrap/bootstrap-use-case"
import { DefaultCreateCategoryUseCase } from "../../../usecase/category/create-category-use-case"
import {
	DefaultCreateSubscriptionUseCase,
	DefaultEndSubscriptionUseCase,
	DefaultListSubscriptionsUseCase,
	DefaultUpdateSubscriptionUseCase,
} from "../../../usecase/subscription/subscription-use-cases"
import { withPostgresTransaction } from "../database"
import { PostgresCategoryRepository } from "../category/postgres-category-repository"
import { PostgresHouseholdMembershipRepository } from "../household/postgres-household-membership-repository"
import { PostgresHouseholdRepository } from "../household/postgres-household-repository"
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
			new DefaultEndSubscriptionUseCase(new PostgresSubscriptionRepository(client)).execute({
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
				new DefaultUpdateSubscriptionUseCase(
					new PostgresSubscriptionRepository(client),
					now,
				).execute({ authorization: other, id: created.id, details }),
			),
			withPostgresTransaction(DATABASE_URL, (client) =>
				new DefaultEndSubscriptionUseCase(new PostgresSubscriptionRepository(client)).execute({
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
})
