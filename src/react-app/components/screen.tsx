import type { ReactNode } from "react"

type ScreenProps = Readonly<{
	title: string
	children: ReactNode
	primaryAction?: ReactNode
}>

export function Screen({ title, children, primaryAction }: ScreenProps) {
	return (
		<main
			id="main-content"
			tabIndex={-1}
			className={`mx-auto w-full max-w-md px-6 pt-5 ${primaryAction ? "pb-24" : "pb-8"}`}
		>
			<header className="flex min-h-11 items-center">
				<h1 className="app-text-ink text-2xl font-semibold tracking-tight">{title}</h1>
			</header>
			<div className="pt-8">{children}</div>
			{primaryAction ? (
				<div className="pointer-events-none fixed inset-x-0 bottom-[calc(4.75rem+env(safe-area-inset-bottom))] z-20 mx-auto flex w-full max-w-md justify-end px-6">
					{primaryAction}
				</div>
			) : null}
		</main>
	)
}
