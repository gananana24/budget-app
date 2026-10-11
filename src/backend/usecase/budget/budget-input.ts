import { MonthStart } from "../../domain/budget/value-objects/month-start"
import { InvalidValueError } from "../../domain/shared/exceptions/invalid-value-error"

export function requestedBudgetMonth(value: unknown, now: Date): MonthStart {
	const month = MonthStart.from(value)
	if (month.value > MonthStart.fromInstantInTokyo(now).value) {
		throw new InvalidValueError("OUT_OF_RANGE", "month")
	}
	return month
}
