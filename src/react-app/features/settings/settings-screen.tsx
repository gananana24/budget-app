import { UserButton } from "@clerk/react"
import { Screen } from "../../components/screen"
import { formatDocumentTitle, messages } from "../../i18n/messages"

export function SettingsScreen() {
	const title = messages.settings.title()
	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<Screen title={title}>
				<section
					className="app-divider flex items-center justify-between gap-4 border-t py-5"
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
