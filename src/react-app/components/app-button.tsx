import type { ComponentProps } from "react"
import { Button } from "@/components/ui/button"

type AppButtonProps = ComponentProps<typeof Button>

export function AppButton({ className, ...props }: AppButtonProps) {
	return <Button variant="ghost" className={`app-button h-11 px-5 ${className ?? ""}`} {...props} />
}
