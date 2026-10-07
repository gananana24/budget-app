import { createFileRoute } from "@tanstack/react-router"
import { HomeScreen } from "../../features/home/home-screen"
import { validateMonthSearch } from "../../features/monthly/month-search"

export const Route = createFileRoute("/_app/")({
	validateSearch: validateMonthSearch,
	component: HomeScreen,
})
