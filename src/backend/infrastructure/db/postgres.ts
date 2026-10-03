import { Client } from "pg"

export class DatabaseConfigurationError extends Error {
	constructor() {
		super("Database connection is not configured")
		this.name = "DatabaseConfigurationError"
	}
}

export function createPostgresClient(connectionString: string): Client {
	if (connectionString.trim().length === 0) {
		throw new DatabaseConfigurationError()
	}

	return new Client({ connectionString })
}

export async function withPostgresClient<Result>(
	connectionString: string,
	operation: (client: Client) => Promise<Result>,
): Promise<Result> {
	const client = createPostgresClient(connectionString)
	await client.connect()

	try {
		return await operation(client)
	} finally {
		await client.end()
	}
}
