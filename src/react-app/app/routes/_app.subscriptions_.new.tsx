import { createFileRoute } from "@tanstack/react-router"
import { SubscriptionFormScreen } from "../../features/subscription/subscription-form-screen"

export const Route = createFileRoute("/_app/subscriptions_/new")({
	component: SubscriptionFormScreen,
})
