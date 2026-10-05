type ApiErrorBody = Readonly<{
	error: Readonly<{
		message: string
		fields: Record<string, string>
	}>
}>

export class ApiError extends Error {
	readonly cause: unknown

	constructor(
		message: string,
		readonly status: number | undefined,
		readonly fields: Readonly<Record<string, string>> = {},
		cause?: unknown,
	) {
		super(message)
		this.name = "ApiError"
		this.cause = cause
	}
}

type ApiClientOptions = Readonly<{
	fetch?: typeof globalThis.fetch
	getToken: () => Promise<string | null>
	networkErrorMessage: string
	invalidResponseMessage: string
}>

type RequestOptions = Readonly<{
	headers?: HeadersInit
	signal?: AbortSignal
}>

function isApiErrorBody(value: unknown): value is ApiErrorBody {
	if (typeof value !== "object" || value === null || !("error" in value)) {
		return false
	}

	const error = value.error
	return (
		typeof error === "object" &&
		error !== null &&
		"message" in error &&
		typeof error.message === "string" &&
		"fields" in error &&
		typeof error.fields === "object" &&
		error.fields !== null
	)
}

async function getAuthToken(
	getToken: ApiClientOptions["getToken"],
	networkErrorMessage: string,
): Promise<string | null> {
	try {
		return await getToken()
	} catch (cause) {
		throw new ApiError(networkErrorMessage, undefined, {}, cause)
	}
}

async function sendRequest(
	fetch: typeof globalThis.fetch,
	path: string,
	init: RequestInit,
	networkErrorMessage: string,
): Promise<Response> {
	try {
		return await fetch(path, init)
	} catch (cause) {
		throw new ApiError(networkErrorMessage, undefined, {}, cause)
	}
}

async function createResponseError(
	response: Response,
	invalidResponseMessage: string,
): Promise<ApiError> {
	try {
		const body: unknown = await response.json()
		return isApiErrorBody(body)
			? new ApiError(body.error.message, response.status, body.error.fields)
			: new ApiError(invalidResponseMessage, response.status)
	} catch (cause) {
		return new ApiError(invalidResponseMessage, response.status, {}, cause)
	}
}

async function parseResponse<T>(response: Response, invalidResponseMessage: string): Promise<T> {
	if (response.status === 204) {
		return undefined as T
	}

	try {
		return (await response.json()) as T
	} catch (cause) {
		throw new ApiError(invalidResponseMessage, response.status, {}, cause)
	}
}

export function createApiClient({
	fetch = globalThis.fetch,
	getToken,
	networkErrorMessage,
	invalidResponseMessage,
}: ApiClientOptions) {
	async function fetchApi<T>(
		path: string,
		method: "GET" | "POST",
		body: unknown,
		options: RequestOptions,
	): Promise<T> {
		const token = await getAuthToken(getToken, networkErrorMessage)
		const headers = new Headers(options.headers)
		headers.set("Accept", "application/json")

		if (token) {
			headers.set("Authorization", `Bearer ${token}`)
		}

		if (body !== undefined) {
			headers.set("Content-Type", "application/json")
		}

		const response = await sendRequest(
			fetch,
			path,
			{
				method,
				headers,
				body: body === undefined ? undefined : JSON.stringify(body),
				signal: options.signal,
			},
			networkErrorMessage,
		)

		if (!response.ok) {
			throw await createResponseError(response, invalidResponseMessage)
		}

		return parseResponse<T>(response, invalidResponseMessage)
	}

	return {
		get<T>(path: string, options: RequestOptions = {}): Promise<T> {
			return fetchApi<T>(path, "GET", undefined, options)
		},
		post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
			return fetchApi<T>(path, "POST", body, options)
		},
	}
}

export type ApiClient = ReturnType<typeof createApiClient>
