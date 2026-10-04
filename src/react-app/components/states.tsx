import type { ReactNode } from "react"
import { messages } from "../i18n/messages"
import { AppButton } from "./app-button"

type StateProps = Readonly<{
	title: string
	description?: string
	action?: ReactNode
}>

function StateLayout({ title, description, action }: StateProps) {
	return (
		<div className="mx-auto flex max-w-sm flex-col items-start gap-3 py-12">
			<h2 className="app-text-ink text-lg font-semibold tracking-tight">{title}</h2>
			{description ? <p className="app-text-muted text-sm leading-6">{description}</p> : null}
			{action ? <div className="pt-2">{action}</div> : null}
		</div>
	)
}

export function LoadingState({ title }: Readonly<{ title: string }>) {
	return (
		<div className="min-h-dvh bg-white px-6" aria-busy="true">
			<div role="status" aria-live="polite">
				<StateLayout title={title} />
			</div>
		</div>
	)
}

export function EmptyState({ title, description, action }: StateProps) {
	return <StateLayout title={title} description={description} action={action} />
}

type ErrorStateProps = Readonly<{
	title: string
	description: string
	onRetry?: () => void
	isRetrying?: boolean
	action?: ReactNode
}>

export function ErrorState({
	title,
	description,
	onRetry,
	isRetrying = false,
	action,
}: ErrorStateProps) {
	const retryAction = onRetry ? (
		<AppButton type="button" onClick={onRetry} disabled={isRetrying}>
			{isRetrying ? messages.action.retrying() : messages.action.retry()}
		</AppButton>
	) : (
		action
	)

	return (
		<div className="min-h-dvh bg-white px-6">
			<div role="alert">
				<StateLayout title={title} description={description} action={retryAction} />
			</div>
		</div>
	)
}
