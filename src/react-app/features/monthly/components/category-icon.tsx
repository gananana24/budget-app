import { DynamicIcon, type IconName } from "lucide-react/dynamic.mjs"
import { lucideIconNames } from "../../../../shared/lucide-icon-names"

const availableNames = new Set<string>(lucideIconNames)

export function CategoryIcon({ iconName }: Readonly<{ iconName: string }>) {
	const name: IconName = availableNames.has(iconName) ? (iconName as IconName) : "tag"
	return (
		<span
			aria-hidden="true"
			className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--budget-primary-soft)] text-[var(--budget-primary)]"
		>
			<DynamicIcon name={name} className="size-5" fallback={() => <span className="size-5" />} />
		</span>
	)
}
