import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { Check, ChevronLeft, Pencil, Plus, Trash2, X } from "lucide-react"
import { type FormEvent, useState } from "react"
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from "../../components/ui/alert-dialog"
import { Button, buttonVariants } from "../../components/ui/button"
import { Input } from "../../components/ui/input"
import { formatDocumentTitle, messages } from "../../i18n/messages"
import { useApiClient } from "../../lib/api-client-context"
import { CategoryIcon } from "../monthly/components/category-icon"
import {
	type Category,
	categoriesQueryKey,
	createCategory,
	deleteCategory,
	getCategoriesQueryOptions,
	updateCategory,
} from "./api/categories"
import { IconPicker } from "./icon-picker"

function validName(value: string): boolean {
	const name = value.trim()
	return name.length > 0 && [...name].length <= 50
}

export function CategorySettingsScreen() {
	const title = messages.settings.categoriesTitle()
	const apiClient = useApiClient()
	const queryClient = useQueryClient()
	const categories = useQuery(getCategoriesQueryOptions(apiClient))
	const [newName, setNewName] = useState("")
	const [newIconName, setNewIconName] = useState("tag")
	const [editingId, setEditingId] = useState<string | null>(null)
	const [editName, setEditName] = useState("")
	const [editIconName, setEditIconName] = useState("tag")
	const [deleteTarget, setDeleteTarget] = useState<Category | null>(null)
	const [error, setError] = useState<string | null>(null)

	async function refresh(): Promise<void> {
		await Promise.all([
			queryClient.invalidateQueries({ queryKey: categoriesQueryKey }),
			queryClient.invalidateQueries({ queryKey: ["monthly-overview"] }),
		])
	}

	const creation = useMutation({
		mutationFn: ({ name, iconName }: { name: string; iconName: string }) =>
			createCategory(apiClient, name, iconName),
		onSuccess: async () => {
			setNewName("")
			setNewIconName("tag")
			setError(null)
			await refresh()
		},
		onError: (reason: Error) => setError(reason.message),
	})
	const update = useMutation({
		mutationFn: ({ id, name, iconName }: { id: string; name: string; iconName: string }) =>
			updateCategory(apiClient, id, name, iconName),
		onSuccess: async () => {
			setEditingId(null)
			setError(null)
			await refresh()
		},
		onError: (reason: Error) => setError(reason.message),
	})
	const deletion = useMutation({
		mutationFn: (id: string) => deleteCategory(apiClient, id),
		onSuccess: async () => {
			setDeleteTarget(null)
			setError(null)
			await refresh()
		},
		onError: (reason: Error) => setError(reason.message),
	})

	function submitCreate(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		if (!validName(newName)) {
			setError(messages.settings.categoryInvalidName())
			return
		}
		setError(null)
		creation.mutate({ name: newName.trim(), iconName: newIconName })
	}

	function submitRename(event: FormEvent<HTMLFormElement>): void {
		event.preventDefault()
		if (!editingId) return
		if (!validName(editName)) {
			setError(messages.settings.categoryInvalidName())
			return
		}
		setError(null)
		update.mutate({ id: editingId, name: editName.trim(), iconName: editIconName })
	}

	return (
		<>
			<title>{formatDocumentTitle(title)}</title>
			<main id="main-content" tabIndex={-1} className="mx-auto w-full max-w-md px-6 pb-28 pt-5">
				<header className="grid min-h-11 grid-cols-[1fr_auto_1fr] items-center gap-2">
					<Link
						to="/settings"
						className={buttonVariants({
							variant: "ghost",
							size: "lg",
							className: "-ml-2 min-h-11 justify-self-start px-2 text-[var(--budget-primary)]",
						})}
					>
						<ChevronLeft aria-hidden="true" />
						{messages.settings.title()}
					</Link>
					<h1 className="app-text-ink whitespace-nowrap text-base font-semibold">{title}</h1>
				</header>
				<section className="mt-8" aria-label={title}>
					{categories.isPending ? (
						<p role="status" className="app-text-muted mt-5 text-sm">
							{messages.settings.categoriesLoading()}
						</p>
					) : null}
					{categories.isError ? (
						<p role="alert" className="mt-5 text-sm text-destructive">
							{categories.error.message}
						</p>
					) : null}
					{categories.data ? (
						<>
							<form onSubmit={submitCreate} className="flex items-center gap-2">
								<IconPicker value={newIconName} onChange={setNewIconName} />
								<Input
									aria-label={messages.settings.categoryName()}
									placeholder={messages.settings.categoryPlaceholder()}
									maxLength={50}
									value={newName}
									onChange={(event) => setNewName(event.target.value)}
									className="min-h-11 min-w-0 flex-1"
								/>
								<Button
									type="submit"
									disabled={creation.isPending}
									className="min-h-11 bg-[var(--budget-primary)] text-white hover:bg-[var(--budget-primary)]/90"
								>
									<Plus aria-hidden="true" />
									{messages.settings.addCategory()}
								</Button>
							</form>
							{error ? (
								<p role="alert" className="mt-3 text-sm text-destructive">
									{error}
								</p>
							) : null}
							<ul className="mt-4 space-y-2">
								{categories.data.categories.map((category) => (
									<li key={category.id} className="rounded-2xl bg-white px-3 py-2">
										{editingId === category.id ? (
											<form onSubmit={submitRename} className="flex items-center gap-2">
												<IconPicker value={editIconName} onChange={setEditIconName} />
												<Input
													aria-label={messages.settings.categoryName()}
													autoFocus
													maxLength={50}
													value={editName}
													onChange={(event) => setEditName(event.target.value)}
													className="min-h-11 min-w-0 flex-1"
												/>
												<Button
													type="submit"
													size="icon-lg"
													variant="ghost"
													aria-label={messages.settings.saveCategory()}
													disabled={update.isPending}
												>
													<Check aria-hidden="true" />
												</Button>
												<Button
													type="button"
													size="icon-lg"
													variant="ghost"
													aria-label={messages.settings.cancelCategory()}
													onClick={() => {
														setEditingId(null)
														setError(null)
													}}
												>
													<X aria-hidden="true" />
												</Button>
											</form>
										) : (
											<div className="flex min-h-11 items-center gap-3">
												<CategoryIcon iconName={category.iconName} />
												<span className="app-text-ink min-w-0 flex-1 break-words text-sm font-medium">
													{category.name}
												</span>
												{category.isInitial ? (
													<span className="app-text-muted text-xs">
														{messages.settings.initialCategory()}
													</span>
												) : (
													<>
														<Button
															type="button"
															size="icon-lg"
															variant="ghost"
															aria-label={messages.settings.renameCategory({ name: category.name })}
															onClick={() => {
																setEditingId(category.id)
																setEditName(category.name)
																setEditIconName(category.iconName)
																setError(null)
															}}
														>
															<Pencil aria-hidden="true" />
														</Button>
														<Button
															type="button"
															size="icon-lg"
															variant="ghost"
															className="text-destructive"
															aria-label={messages.settings.deleteCategory({ name: category.name })}
															onClick={() => {
																setDeleteTarget(category)
																setError(null)
															}}
														>
															<Trash2 aria-hidden="true" />
														</Button>
													</>
												)}
											</div>
										)}
									</li>
								))}
							</ul>
						</>
					) : null}
				</section>
			</main>
			<AlertDialog
				open={deleteTarget !== null}
				onOpenChange={(open) => {
					if (!open && !deletion.isPending) {
						setDeleteTarget(null)
						setError(null)
					}
				}}
			>
				<AlertDialogContent className="w-[calc(100%-2rem)] max-h-[calc(100dvh-2rem)] overflow-y-auto">
					<AlertDialogHeader>
						<AlertDialogTitle>
							{messages.settings.deleteCategoryTitle({ name: deleteTarget?.name ?? "" })}
						</AlertDialogTitle>
						<AlertDialogDescription>
							{messages.settings.deleteCategoryDescription()}
						</AlertDialogDescription>
					</AlertDialogHeader>
					{deletion.isError ? (
						<p role="alert" className="text-sm text-destructive">
							{deletion.error.message}
						</p>
					) : null}
					<AlertDialogFooter>
						<AlertDialogCancel disabled={deletion.isPending} className="min-h-11">
							{messages.settings.cancelCategory()}
						</AlertDialogCancel>
						<AlertDialogAction
							variant="destructive"
							disabled={deletion.isPending}
							className="min-h-11"
							onClick={() => {
								if (deleteTarget) deletion.mutate(deleteTarget.id)
							}}
						>
							{messages.settings.confirmDeleteCategory()}
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	)
}
