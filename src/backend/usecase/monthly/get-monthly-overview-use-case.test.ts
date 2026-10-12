import { describe, expect, it } from "vitest"
import { AuthorizationContext } from "../../domain/household/value-objects/authorization-context"
import { HouseholdId } from "../../domain/household/value-objects/household-id"
import type { MonthlyOverviewRepository } from "../../domain/monthly/repositories/monthly-overview-repository"
import { MonthStart } from "../../domain/monthly/value-objects/month-start"
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
			totalExpenseAmount: 1_300,
			uncategorizedExpenseAmount: 500,
			categories: [
				{ id: "food", name: "食費", seedKey: "food", iconName: "utensils", expenseAmount: 800 },
				{ id: "other", name: "その他", seedKey: "other", iconName: "ellipsis", expenseAmount: 0 },
				{ id: "zero", name: "予備費", seedKey: null, iconName: "tag", expenseAmount: 0 },
			],
			expenses: [],
		}),
	}
}

describe("get monthly overview", () => {
	it("returns monthly and category expense totals", async () => {
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
			totals: { expenses: 1_300 },
			uncategorized: { expenses: 500 },
			categories: [
				{
					id: "food",
					name: "食費",
					seedKey: "food",
					iconName: "utensils",
					expenses: 800,
				},
				{
					id: "other",
					name: "その他",
					seedKey: "other",
					iconName: "ellipsis",
					expenses: 0,
				},
				{
					id: "zero",
					name: "予備費",
					seedKey: null,
					iconName: "tag",
					expenses: 0,
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
