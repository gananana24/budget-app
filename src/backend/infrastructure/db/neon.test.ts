import { describe, expect, it } from "vitest"
import { createNeonSql, DatabaseConfigurationError } from "./neon"

describe("createNeonSql", () => {
	it("creates an HTTP query function without opening a connection", () => {
		// Arrange
		const databaseUrl = "postgresql://user:password@example.com/database"

		// Act
		const sql = createNeonSql(databaseUrl)

		// Assert
		expect(typeof sql).toBe("function")
	})

	it("rejects a missing connection string", () => {
		// Arrange
		const databaseUrl = "  "

		// Act
		const createSql = () => createNeonSql(databaseUrl)

		// Assert
		expect(createSql).toThrow(DatabaseConfigurationError)
	})
})
