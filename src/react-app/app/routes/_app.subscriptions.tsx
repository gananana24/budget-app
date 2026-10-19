import { createFileRoute } from "@tanstack/react-router"
import { SubscriptionScreen } from "../../features/subscription/subscription-screen"

export const Route = createFileRoute("/_app/subscriptions")({ component: SubscriptionScreen })
