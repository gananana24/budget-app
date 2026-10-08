import { describe, expect, it } from "vitest"
import { MonthStart } from "../../domain/budget/value-objects/month-start"
import { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { HouseholdId } from "../../domain/household/value-objects/household-id"
import type { MonthlyOverviewRepository } from "../../domain/monthly/repositories/monthly-overview-repository"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"
import { UserId } from "../../domain/user/value-objects/user-id"
import { DefaultGetMonthlyOverviewUseCase } from "./get-monthly-overview-use-case"

function createAuthorization(): AuthorizationContext {
	return new AuthorizationContext(
		UserId.from("00000000-0000-4000-8000-000000000001"),
		HouseholdId.from("00000000-0000-4000-8000-000000000002"),
	)
}

function createRepository(): MonthlyOverviewRepository {
	return {
		findByMonth: async () => ({
			initialized: true,
			totalBudgetAmount: 1_000,
			totalExpenseAmount: 1_300,
			uncategorizedExpenseAmount: 500,
			categories: [
				{ id: "food", name: "食費", iconName: "utensils", budgetAmount: 1_000, expenseAmount: 800 },
				{ id: "other", name: "その他", iconName: "ellipsis", budgetAmount: null, expenseAmount: 0 },
				{ id: "zero", name: "予備費", iconName: "tag", budgetAmount: 0, expenseAmount: 0 },
			],
			expenses: [],
		}),
	}
}

describe("get monthly overview", () => {
	it("calculates monthly and category balances while preserving budget states", async () => {
		// Arrange
		const useCase = new DefaultGetMonthlyOverviewUseCase({
			monthlyOverviewRepository: createRepository(),
			now: () => new Date("2026-09-23T03:00:00.000Z"),
		})

		// Act
		const result = await useCase.execute({
			authorization: createAuthorization(),
			month: "2026-09-01",
		})

		// Assert
		expect(result).toEqual({
			month: "2026-09-01",
			initialized: true,
			totals: { budget: 1_000, expenses: 1_300, remaining: -300 },
			uncategorized: { expenses: 500 },
			categories: [
				{
					id: "food",
					name: "食費",
					iconName: "utensils",
					budget: { status: "set", amount: 1_000 },
					expenses: 800,
					remaining: 200,
				},
				{
					id: "other",
					name: "その他",
					iconName: "ellipsis",
					budget: { status: "unset" },
					expenses: 0,
					remaining: null,
				},
				{
					id: "zero",
					name: "予備費",
					iconName: "tag",
					budget: { status: "set", amount: 0 },
					expenses: 0,
					remaining: 0,
				},
			],
			expenses: [],
		})
	})

	it.each(["2026-9-01", "2026-09-02", "invalid"])("rejects an invalid month: %s", async (month) => {
		// Arrange
		const useCase = new DefaultGetMonthlyOverviewUseCase({
			monthlyOverviewRepository: createRepository(),
			now: () => new Date("2026-09-23T03:00:00.000Z"),
		})

		// Act
		const result = useCase.execute({ authorization: createAuthorization(), month })

		// Assert
		await expect(result).rejects.toEqual(new InvalidValueError("INVALID_FORMAT"))
	})

	it("rejects a future Tokyo month without reading the database", async () => {
		// Arrange
		let didRead = false
		const repository: MonthlyOverviewRepository = {
			findByMonth: async () => {
				didRead = true
				return createRepository().findByMonth(
					HouseholdId.from("00000000-0000-4000-8000-000000000002"),
					MonthStart.from("2026-10-01"),
				)
			},
		}
		const useCase = new DefaultGetMonthlyOverviewUseCase({
			monthlyOverviewRepository: repository,
			now: () => new Date("2026-09-30T14:59:59.999Z"),
		})

		// Act
		const result = useCase.execute({
			authorization: createAuthorization(),
			month: "2026-10-01",
		})

		// Assert
		await expect(result).rejects.toEqual(new InvalidValueError("OUT_OF_RANGE"))
		expect(didRead).toBe(false)
	})
})
