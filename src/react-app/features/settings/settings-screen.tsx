import { UserButton } from "@clerk/react"
import { Link } from "@tanstack/react-router"
import { ChevronRight, Tags } from "lucide-react"
import { Screen } from "../../components/screen"
import { formatDocumentTitle, messages } from "../../i18n/messages"

export function SettingsScreen() {
	const title = messages.settings.title()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen title={title}>
				<Link
					to="/settings/categories"
					className="app-text-ink flex min-h-16 items-center gap-3 rounded-2xl bg-white px-4 text-base font-medium focus-visible:outline-2 focus-visible:outline-offset-2"
				>
					<span
						aria-hidden="true"
						className="flex size-10 items-center justify-center rounded-xl bg-[var(--budget-primary-soft)] text-[var(--budget-primary)]"
					>
						<Tags className="size-5" />
					</span>
					<span className="flex-1">{messages.settings.categoriesTitle()}</span>
					<ChevronRight aria-hidden="true" className="app-text-muted size-5" />
				</Link>
				<section
					className="mt-8 flex min-h-16 items-center justify-between gap-4 rounded-2xl bg-white px-4"
					aria-labelledby="account-heading"
				>
					<h2 id="account-heading" className="app-text-ink text-base font-medium">
						{messages.settings.accountLabel()}
					</h2>
					<UserButton />
				</section>
			</Screen>
		</>
	)
}
