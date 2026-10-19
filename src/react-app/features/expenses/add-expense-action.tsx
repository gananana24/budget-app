import { Link } from "@tanstack/react-router"
import { cn } from "cn"
import { Pencil } from "lucide-react"
import { buttonVariants } from "../../components/ui/button"
import { messages } from "../../i18n/messages"

export function AddExpenseAction({ month }: Readonly<{ month: string }>) {
	return (
		<Link
			to="/expenses/new"
			search={{ month: month.slice(0, 7) }}
			className={cn(
				buttonVariants({ size: "icon-lg" }),
				"app-primary-action pointer-events-auto h-14 w-14 rounded-full px-0 shadow-md active:shadow-sm [&_svg]:size-6",
			)}
		>
			<Pencil aria-hidden="true" />
			<span className="sr-only">{messages.home.addExpense()}</span>
		</Link>
	)
}
