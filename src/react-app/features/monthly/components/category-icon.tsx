import { DynamicIcon, type IconName } from "lucide-react/dynamic.mjs"
import { lucideIconNames } from "../../../../shared/lucide-icon-names"

const availableNames = new Set<string>(lucideIconNames)

export function CategoryIcon({
	iconName,
	compact = false,
}: Readonly<{ iconName: string; compact?: boolean }>) {
	const name: IconName = availableNames.has(iconName) ? (iconName as IconName) : "tag"
	return (
		<span
			aria-hidden="true"
			className={`flex shrink-0 items-center justify-center bg-[var(--budget-primary-soft)] text-[var(--budget-primary)] ${compact ? "size-8 rounded-lg" : "size-10 rounded-xl"}`}
		>
			<DynamicIcon
				name={name}
				className={compact ? "size-4" : "size-5"}
				fallback={() => <span className={compact ? "size-4" : "size-5"} />}
			/>
		</span>
	)
}
