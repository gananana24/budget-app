import { createFileRoute } from "@tanstack/react-router"
import { ExpensesScreen } from "../../features/expenses/expenses-screen"
import { validateMonthSearch } from "../../features/monthly/month-search"

export const Route = createFileRoute("/_app/expenses")({
	validateSearch: validateMonthSearch,
	component: ExpensesScreen,
})
