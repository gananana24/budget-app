import { describe, expect, it } from "vitest"
import { DatabaseConfigurationError, newPostgresClient } from "./database"

describe("newPostgresClient", () => {
	it("creates a request-scoped client without opening a connection", () => {
		// Arrange
		const connectionString = "postgresql://user:password@example.com/database"

		// Act
		const client = newPostgresClient(connectionString)

		// Assert
		expect(client).toBeDefined()
	})

	it("rejects a missing connection string", () => {
		// Arrange
		const connectionString = "  "

		// Act
		const createClient = () => newPostgresClient(connectionString)

		// Assert
		expect(createClient).toThrow(DatabaseConfigurationError)
	})
})
