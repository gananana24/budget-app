import { DynamicIcon, type IconName } from "lucide-react/dynamic.mjs"
import { useState } from "react"
import { lucideIconNames } from "../../../shared/lucide-icon-names"
import { Button } from "../../components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "../../components/ui/popover"
import { Separator } from "../../components/ui/separator"
import { messages } from "../../i18n/messages"

const suggestions = [
	"tag",
	"paw-print",
	"coffee",
	"utensils",
	"shopping-basket",
	"house",
	"car",
	"train-front",
	"plane",
	"book-open",
	"graduation-cap",
	"gamepad-2",
	"gift",
	"baby",
	"shirt",
	"heart-pulse",
	"pill",
	"smartphone",
	"wallet",
	"piggy-bank",
] as const
const suggestionNames = new Set<string>(suggestions)
const remainingNames = lucideIconNames.filter((name) => !suggestionNames.has(name))
const PAGE_SIZE = 50

function IconGrid({
	names,
	value,
	onSelect,
}: Readonly<{ names: readonly string[]; value: string; onSelect: (name: string) => void }>) {
	return (
		<div className="grid grid-cols-5 gap-1.5">
			{names.map((name) => (
				<Button
					key={name}
					type="button"
					variant="outline"
					size="icon-lg"
					aria-label={name}
					aria-pressed={value === name}
					onClick={() => onSelect(name)}
					className={`min-h-11 min-w-11 rounded-xl ${value === name ? "border-[var(--budget-primary)] bg-[var(--budget-primary-soft)]" : ""}`}
				>
					<DynamicIcon
						name={name as IconName}
						className="size-5"
						fallback={() => <span className="size-5" />}
					/>
				</Button>
			))}
		</div>
	)
}

export function IconPicker({
	value,
	onChange,
}: Readonly<{ value: string; onChange: (name: string) => void }>) {
	const [open, setOpen] = useState(false)
	const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
	function select(name: string): void {
		onChange(name)
		setOpen(false)
	}

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				render={
					<Button
						type="button"
						variant="outline"
						className="min-h-11 shrink-0 gap-2 px-3"
						aria-label={messages.settings.selectIcon()}
					/>
				}
			>
				<DynamicIcon
					name={value as IconName}
					className="size-5"
					fallback={() => <span className="size-5" />}
				/>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-[min(21rem,calc(100vw-3rem))] p-3">
				<div className="max-h-[min(48dvh,24rem)] overflow-y-auto">
					<IconGrid names={suggestions} value={value} onSelect={select} />
					<Separator aria-hidden="true" className="my-3" />
					<IconGrid names={remainingNames.slice(0, visibleCount)} value={value} onSelect={select} />
					{visibleCount < remainingNames.length ? (
						<Button
							type="button"
							variant="ghost"
							className="mt-3 min-h-11 w-full"
							onClick={() =>
								setVisibleCount((count) => Math.min(count + PAGE_SIZE, remainingNames.length))
							}
						>
							{messages.settings.moreIcons()}
						</Button>
					) : null}
				</div>
			</PopoverContent>
		</Popover>
	)
}
