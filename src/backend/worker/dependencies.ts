import { createNeonSql } from "../infrastructure/db/neon"

type DatabaseEnv = Pick<Env, "DATABASE_URL">

export function createWorkerDependencies(env: DatabaseEnv) {
	return {
		sql: createNeonSql(env.DATABASE_URL),
	}
}
