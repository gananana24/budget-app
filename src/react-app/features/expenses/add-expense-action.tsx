import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { Pencil } from "lucide-react"
import { buttonVariants } from "../../components/ui/button"
import { messages } from "../../i18n/messages"

export function AddExpenseAction({
	month,
	showLabel = false,
}: Readonly<{ month: string; showLabel?: boolean }>) {
	return (
		<Link
			to="/expenses/new"
			search={{ month: month.slice(0, 7) }}
			className={cn(
				buttonVariants({ size: "icon-lg" }),
				"app-primary-action pointer-events-auto h-14 rounded-full shadow-md active:shadow-sm",
				showLabel ? "w-auto gap-2 px-5 text-sm font-semibold" : "w-14 px-0 [&_svg]:size-6",
			)}
		>
			<Pencil aria-hidden="true" />
			<span className={showLabel ? undefined : "sr-only"}>{messages.home.addExpense()}</span>
		</Link>
	)
}
