import { messages } from "./messages"

type NamedCategory = Readonly<{ name: string; seedKey: string | null }>

export function categoryDisplayName(category: NamedCategory): string {
	const key = category.seedKey
	if (key && key in messages.category) {
		return messages.category[key as keyof typeof messages.category]()
	}
	return category.name
}
