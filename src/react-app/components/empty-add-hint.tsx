export function EmptyAddHint({ message }: Readonly<{ message: string }>) {
	return (
		<div className="pointer-events-none fixed inset-x-0 bottom-[calc(8.5rem+env(safe-area-inset-bottom))] z-10 mx-auto w-full max-w-md px-6">
			<div className="ml-auto w-52">
				<p className="app-text-muted text-right text-sm font-medium">{message}</p>
				<svg
					aria-hidden="true"
					className="ml-auto mr-4 mt-1 h-[4.5rem] w-28 text-[var(--budget-primary)]"
					viewBox="0 0 112 72"
					fill="none"
				>
					<path
						d="M10 8c21-9 43-4 45 14 1 12-15 16-22 8-8-10 4-18 17-12 18 9 20 33 42 40"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
					<path
						d="m77 54 15 4-7-15"
						stroke="currentColor"
						strokeWidth="2.5"
						strokeLinecap="round"
						strokeLinejoin="round"
					/>
				</svg>
			</div>
		</div>
	)
}
