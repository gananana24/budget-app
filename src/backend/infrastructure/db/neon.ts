import { type NeonQueryFunction, neon } from "@neondatabase/serverless"

export class DatabaseConfigurationError extends Error {
	constructor() {
		super("Database connection is not configured")
		this.name = "DatabaseConfigurationError"
	}
}

export function createNeonSql(databaseUrl: string): NeonQueryFunction<false, false> {
	if (databaseUrl.trim().length === 0) {
		throw new DatabaseConfigurationError()
	}

	return neon(databaseUrl)
}
