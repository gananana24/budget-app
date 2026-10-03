import { describe, expect, it } from "vitest"
import { createPostgresClient, DatabaseConfigurationError } from "./postgres"

describe("createPostgresClient", () => {
	it("creates a request-scoped client without opening a connection", () => {
		// Arrange
		const connectionString = "postgresql://user:password@example.com/database"

		// Act
		const client = createPostgresClient(connectionString)

		// Assert
		expect(client).toBeDefined()
	})

	it("rejects a missing connection string", () => {
		// Arrange
		const connectionString = "  "

		// Act
		const createClient = () => createPostgresClient(connectionString)

		// Assert
		expect(createClient).toThrow(DatabaseConfigurationError)
	})
})
