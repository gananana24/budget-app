import { createFileRoute } from "@tanstack/react-router"
import { ExpensesScreen } from "../../features/expenses/expenses-screen"

export const Route = createFileRoute("/_app/expenses")({ component: ExpensesScreen })
