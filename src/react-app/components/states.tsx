import type { ReactNode } from "react"
import { messages } from "../i18n/messages"
import { AppButton } from "./app-button"
import { Spinner } from "./ui/spinner"

type StateProps = Readonly<{
	title: string
	description?: string
	action?: ReactNode
}>

function StateLayout({
	title,
	description,
	action,
	centered = false,
}: StateProps & { centered?: boolean }) {
	return (
		<div
			className={`mx-auto flex w-full max-w-sm flex-col gap-3 py-12 ${centered ? "items-center text-center" : "items-start"}`}
		>
			<h2 className="app-text-ink text-lg font-semibold tracking-tight">{title}</h2>
			{description ? <p className="app-text-muted text-sm leading-6">{description}</p> : null}
			{action ? <div className="pt-2">{action}</div> : null}
		</div>
	)
}

export function LoadingState({ title }: Readonly<{ title: string }>) {
	return (
		<div className="flex min-h-dvh items-center justify-center bg-background px-6">
			<div
				role="status"
				aria-live="polite"
				className="flex flex-col items-center gap-5 text-center"
			>
				<Spinner aria-hidden="true" className="size-7 text-primary" />
				<p className="app-text-muted text-sm font-medium leading-6">{title}</p>
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
		<div className="flex min-h-dvh items-center justify-center bg-background px-6">
			<div role="alert" className="w-full">
				<StateLayout title={title} description={description} action={retryAction} centered />
			</div>
		</div>
	)
}
