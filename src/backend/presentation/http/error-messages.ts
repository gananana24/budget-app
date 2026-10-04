export const errorMessages = {
	UNAUTHORIZED: "ログインを確認できませんでした。もう一度ログインしてからお試しください。",
	BOOTSTRAP_REQUIRED: "家計簿の準備が完了していません。",
	VALIDATION_ERROR: "入力内容を確認してください。",
	NOT_FOUND: "指定された情報が見つかりませんでした。",
	INTERNAL_ERROR: "処理を完了できませんでした。しばらくしてから、もう一度お試しください。",
} as const

export type ErrorCode = keyof typeof errorMessages
