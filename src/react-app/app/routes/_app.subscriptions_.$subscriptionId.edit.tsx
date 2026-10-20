import { createFileRoute } from "@tanstack/react-router"
import { SubscriptionFormScreen } from "../../features/subscription/subscription-form-screen"

export const Route = createFileRoute("/_app/subscriptions_/$subscriptionId/edit")({
	component: EditSubscriptionRoute,
})

function EditSubscriptionRoute() {
	const { subscriptionId } = Route.useParams()
	return <SubscriptionFormScreen subscriptionId={subscriptionId} />
}
