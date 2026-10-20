import { clerkMiddleware, getAuth } from "@clerk/hono"
import { newScheduledDependencies, newWorkerDependencies } from "../infrastructure/di/injection"
import { createHttpApp } from "../presentation/http/app"
import { createAuthenticatedUserMiddleware } from "../presentation/http/authentication"
import { getDateInTokyo } from "../domain/shared/services/tokyo-calendar"

export default {
	async scheduled(controller: ScheduledController, env: Env): Promise<void> {
		const today = getDateInTokyo(new Date(controller.scheduledTime))
		const posted = await newScheduledDependencies(env).execute(today)
		console.info(JSON.stringify({ event: "subscription_posting", date: today, posted }))
	},
	async fetch(request: Request, env: Env, executionContext: ExecutionContext): Promise<Response> {
		const dependencies = newWorkerDependencies(env)
		const app = createHttpApp({
			authenticationMiddleware: [
				clerkMiddleware(),
				createAuthenticatedUserMiddleware((context) => getAuth(context).userId),
			],
			bootstrapUseCase: dependencies.bootstrapUseCase,
			resolveAuthorizationUseCase: dependencies.resolveAuthorizationUseCase,
			createExpenseUseCase: dependencies.createExpenseUseCase,
			updateExpenseUseCase: dependencies.updateExpenseUseCase,
			deleteExpenseUseCase: dependencies.deleteExpenseUseCase,
			getMonthlyOverviewUseCase: dependencies.getMonthlyOverviewUseCase,
			listCategoriesUseCase: dependencies.listCategoriesUseCase,
			createCategoryUseCase: dependencies.createCategoryUseCase,
			updateCategoryUseCase: dependencies.updateCategoryUseCase,
			deleteCategoryUseCase: dependencies.deleteCategoryUseCase,
			listSubscriptionsUseCase: dependencies.listSubscriptionsUseCase,
			createSubscriptionUseCase: dependencies.createSubscriptionUseCase,
			updateSubscriptionUseCase: dependencies.updateSubscriptionUseCase,
			endSubscriptionUseCase: dependencies.endSubscriptionUseCase,
		})

		return await app.fetch(request, env, executionContext)
	},
} satisfies ExportedHandler<Env>
