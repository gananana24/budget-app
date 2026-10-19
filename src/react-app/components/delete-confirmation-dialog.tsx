import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "./ui/alert-dialog"
import { messages } from "../i18n/messages"

export function DeleteConfirmationDialog({
	open,
	onOpenChange,
	title,
	description,
	error,
	isPending,
	onConfirm,
}: Readonly<{
	open: boolean
	onOpenChange: (open: boolean) => void
	title: string
	description: string
	error: Error | null
	isPending: boolean
	onConfirm: () => void
}>) {
	return (
		<AlertDialog
			open={open}
			onOpenChange={(nextOpen) => {
				if (!isPending) onOpenChange(nextOpen)
			}}
		>
			<AlertDialogContent>
				<AlertDialogHeader>
					<AlertDialogTitle>{title}</AlertDialogTitle>
					<AlertDialogDescription>{description}</AlertDialogDescription>
				</AlertDialogHeader>
				{error ? (
					<p role="alert" className="text-sm text-destructive">
						{error.message}
					</p>
				) : null}
				<AlertDialogFooter>
					<AlertDialogCancel disabled={isPending}>{messages.expenses.cancel()}</AlertDialogCancel>
					<AlertDialogAction
						variant="destructive"
						className="bg-destructive text-white active:bg-destructive/90"
						disabled={isPending}
						onClick={onConfirm}
					>
						{isPending ? messages.expenses.deleting() : messages.expenses.delete()}
					</AlertDialogAction>
				</AlertDialogFooter>
			</AlertDialogContent>
		</AlertDialog>
	)
}
