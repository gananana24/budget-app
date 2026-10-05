import type { ReactNode } from "react"

type ScreenProps = Readonly<{
	title: string
	children: ReactNode
	action?: ReactNode
}>

export function Screen({ title, children, action }: ScreenProps) {
	return (
		<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-md px-6 pb-28 pt-5">
			<header className="flex min-h-11 items-center justify-between gap-4">
				<h1 className="app-text-ink text-2xl font-semibold tracking-tight">{title}</h1>
				{action}
			</header>
			<div className="pt-8">{children}</div>
		</main>
	)
}
