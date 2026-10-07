import {
	CircleHelp,
	Droplets,
	Gamepad2,
	HeartPulse,
	House,
	type LucideIcon,
	MoreHorizontal,
	ShoppingBasket,
	Smartphone,
	Tag,
	TrainFront,
	Utensils,
} from "lucide-react"

const icons: Record<string, LucideIcon> = {
	食費: Utensils,
	日用品: ShoppingBasket,
	住居費: House,
	水道光熱費: Droplets,
	通信費: Smartphone,
	交通費: TrainFront,
	医療費: HeartPulse,
	娯楽費: Gamepad2,
	その他: MoreHorizontal,
	未分類: CircleHelp,
}

export function CategoryIcon({ name }: Readonly<{ name: string }>) {
	const Icon = icons[name] ?? Tag
	return (
		<span
			aria-hidden="true"
			className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--budget-primary-soft)] text-[var(--budget-primary)]"
		>
			<Icon className="size-5" />
		</span>
	)
}
