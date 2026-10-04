import { createRouter, RouterProvider } from "@tanstack/react-router"
import { useState } from "react"
import { routeTree } from "./route-tree.gen"

function createAppRouter() {
	return createRouter({
		routeTree,
		defaultPreload: "intent",
		scrollRestoration: true,
	})
}

type AppRouterInstance = ReturnType<typeof createAppRouter>

declare module "@tanstack/react-router" {
	interface Register {
		router: AppRouterInstance
	}
}

export function AppRouter() {
	const [router] = useState(createAppRouter)
	return <RouterProvider router={router} />
}
