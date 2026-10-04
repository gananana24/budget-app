import { createFileRoute } from "@tanstack/react-router"
import { BudgetScreen } from "../../features/budget/budget-screen"

export const Route = createFileRoute("/_app/budget")({ component: BudgetScreen })
