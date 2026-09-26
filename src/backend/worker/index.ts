import { clerkMiddleware, getAuth } from "@clerk/hono"
import { createHttpApp } from "../presentation/http/app"
import { createAuthenticatedUserMiddleware } from "../presentation/http/authentication"

const app = createHttpApp({
	authenticationMiddleware: [
		clerkMiddleware(),
		createAuthenticatedUserMiddleware((context) => getAuth(context).userId),
	],
})

export default app
