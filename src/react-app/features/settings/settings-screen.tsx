import { UserButton } from "@clerk/react"
import { Link } from "@tanstack/react-router"
import { ChevronRight, Languages, Tags } from "lucide-react"
import { Screen } from "../../components/screen"
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "../../components/ui/select"
import { formatDocumentTitle, languageName, messages } from "../../i18n/messages"
import { getLocale, setLocale } from "../../paraglide/runtime.js"

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
					className="mt-4 flex min-h-16 items-center justify-between gap-3 rounded-2xl bg-white px-4"
					aria-labelledby="language-heading"
				>
					<div className="flex min-w-0 flex-1 items-center gap-3">
						<span
							aria-hidden="true"
							className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--budget-primary-soft)] text-[var(--budget-primary)]"
						>
							<Languages className="size-5" />
						</span>
						<h2 id="language-heading" className="app-text-ink text-base font-medium">
							{messages.settings.languageLabel()}
						</h2>
					</div>
					<Select
						value={getLocale()}
						onValueChange={(value) => {
							if (value === "ja" || value === "en" || value === "es") setLocale(value)
						}}
					>
						<SelectTrigger aria-labelledby="language-heading" className="min-h-11 min-w-28">
							<SelectValue>{languageName}</SelectValue>
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="ja">{messages.settings.languageJapanese()}</SelectItem>
							<SelectItem value="en">{messages.settings.languageEnglish()}</SelectItem>
							<SelectItem value="es">{messages.settings.languageSpanish()}</SelectItem>
						</SelectContent>
					</Select>
				</section>
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
