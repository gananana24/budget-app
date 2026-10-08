import { createFileRoute } from "@tanstack/react-router"
import { CategorySettingsScreen } from "../../features/settings/category-settings-screen"

export const Route = createFileRoute("/_app/settings_/categories")({
	component: CategorySettingsScreen,
})
