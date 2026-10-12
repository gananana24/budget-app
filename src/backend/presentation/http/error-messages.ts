const ja = {
	UNAUTHORIZED: "ログインを確認できませんでした。もう一度ログインしてからお試しください。",
	BOOTSTRAP_REQUIRED: "家計簿の準備が完了していません。",
	VALIDATION_ERROR: "入力内容を確認してください。",
	CATEGORY_NAME_CONFLICT: "同じ名前のカテゴリーがすでにあります。",
	NOT_FOUND: "指定された情報が見つかりませんでした。",
	INTERNAL_ERROR: "処理を完了できませんでした。しばらくしてから、もう一度お試しください。",
} as const

const en: Record<keyof typeof ja, string> = {
	UNAUTHORIZED: "Could not verify your sign-in. Please sign in again and retry.",
	BOOTSTRAP_REQUIRED: "Your budget is not ready yet.",
	VALIDATION_ERROR: "Check your input and try again.",
	CATEGORY_NAME_CONFLICT: "A category with this name already exists.",
	NOT_FOUND: "The requested item was not found.",
	INTERNAL_ERROR: "Could not complete the request. Please try again later.",
}

export type ErrorCode = keyof typeof ja

export function errorMessage(code: ErrorCode, acceptLanguage: string | undefined): string {
	return acceptLanguage?.toLowerCase().startsWith("en") ? en[code] : ja[code]
}
