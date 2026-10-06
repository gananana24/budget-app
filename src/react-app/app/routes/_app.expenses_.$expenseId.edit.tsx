import { createFileRoute } from "@tanstack/react-router"
import { EditExpenseScreen } from "../../features/expenses/edit-expense-screen"
import { validateMonthSearch } from "../../features/monthly/month-search"

export const Route = createFileRoute("/_app/expenses_/$expenseId/edit")({
	validateSearch: validateMonthSearch,
	component: EditExpenseRoute,
})

function EditExpenseRoute() {
	const { expenseId } = Route.useParams()
	return <EditExpenseScreen expenseId={expenseId} />
}
