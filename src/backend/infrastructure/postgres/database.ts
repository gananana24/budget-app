import { Client } from "pg"

export class DatabaseConfigurationError extends Error {
	constructor() {
		super("Database connection is not configured")
		this.name = "DatabaseConfigurationError"
	}
}

export function newPostgresClient(connectionString: string): Client {
	if (connectionString.trim().length === 0) {
		throw new DatabaseConfigurationError()
	}

	return new Client({ connectionString })
}

export async function withPostgresClient<Result>(
	connectionString: string,
	operation: (client: Client) => Promise<Result>,
): Promise<Result> {
	const client = newPostgresClient(connectionString)
	await client.connect()

	try {
		return await operation(client)
	} finally {
		await client.end()
	}
}

export async function withPostgresTransaction<Result>(
	connectionString: string,
	operation: (client: Client) => Promise<Result>,
): Promise<Result> {
	return withPostgresClient(connectionString, async (client) => {
		await client.query("BEGIN")

		try {
			const result = await operation(client)
			await client.query("COMMIT")
			return result
		} catch (error) {
			await client.query("ROLLBACK")
			throw error
		}
	})
}

export async function withPostgresReadTransaction<Result>(
	connectionString: string,
	operation: (client: Client) => Promise<Result>,
): Promise<Result> {
	return withPostgresClient(connectionString, async (client) => {
		await client.query("BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY")

		try {
			const result = await operation(client)
			await client.query("COMMIT")
			return result
		} catch (error) {
			await client.query("ROLLBACK")
			throw error
		}
	})
}
