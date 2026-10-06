import { createFileRoute } from "@tanstack/react-router"
import { NewExpenseScreen } from "../../features/expenses/new-expense-screen"
import { validateMonthSearch } from "../../features/monthly/month-search"

export const Route = createFileRoute("/_app/expenses_/new")({
	validateSearch: validateMonthSearch,
	component: NewExpenseScreen,
})
