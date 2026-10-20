import { spawnSync } from "node:child_process"
import { existsSync, readFileSync, statSync } from "node:fs"
import { parseEnv } from "node:util"

const deployEnvFile = ".env.deploy.local"

function productionDatabaseUrl(): string {
	const fromEnvironment = process.env.PRODUCTION_DATABASE_URL
	if (fromEnvironment) return fromEnvironment
	if (!existsSync(deployEnvFile)) {
		throw new Error(`Set PRODUCTION_DATABASE_URL or create ${deployEnvFile} before deploying`)
	}
	if ((statSync(deployEnvFile).mode & 0o077) !== 0) {
		throw new Error(`Restrict ${deployEnvFile} to your user with chmod 600`)
	}
	const values = parseEnv(readFileSync(deployEnvFile, "utf8"))
	if (!values.PRODUCTION_DATABASE_URL) {
		throw new Error(`Set PRODUCTION_DATABASE_URL in ${deployEnvFile}`)
	}
	return values.PRODUCTION_DATABASE_URL
}

function validateDatabaseUrl(value: string): void {
	let url: URL
	try {
		url = new URL(value)
	} catch {
		throw new Error("PRODUCTION_DATABASE_URL must be a PostgreSQL connection URL")
	}
	const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
	const localHost =
		host === "localhost" ||
		host === "::1" ||
		host.endsWith(".localhost") ||
		host.endsWith(".local") ||
		/^127\./.test(host) ||
		/^10\./.test(host) ||
		/^192\.168\./.test(host) ||
		/^172\.(1[6-9]|2\d|3[01])\./.test(host)
	if (
		(url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
		!host ||
		localHost ||
		!url.username ||
		!url.password ||
		url.pathname.length < 2 ||
		url.searchParams.get("sslmode") === "disable" ||
		host.includes("-pooler.")
	) {
		throw new Error("PRODUCTION_DATABASE_URL must point to a remote direct PostgreSQL database")
	}
}

function workerSecretsArgs(): string[] {
	const file = process.env.WORKER_SECRETS_FILE
	if (!file) return []
	if (!existsSync(file)) throw new Error("WORKER_SECRETS_FILE does not exist")
	if ((statSync(file).mode & 0o077) !== 0) {
		throw new Error("Restrict WORKER_SECRETS_FILE to your user with chmod 600")
	}
	const values = parseEnv(readFileSync(file, "utf8"))
	if (!values.CLERK_PUBLISHABLE_KEY || !values.CLERK_SECRET_KEY) {
		throw new Error("WORKER_SECRETS_FILE must contain both Clerk keys")
	}
	return ["--secrets-file", file]
}

function run(args: string[], env: NodeJS.ProcessEnv): void {
	const result = spawnSync("pnpm", args, { env, stdio: "inherit" })
	if (result.error) throw result.error
	if (result.status !== 0) throw new Error(`pnpm ${args.join(" ")} failed`)
}

try {
	const databaseUrl = productionDatabaseUrl()
	validateDatabaseUrl(databaseUrl)
	const secretsArgs = workerSecretsArgs()

	const deployEnv = { ...process.env }
	delete deployEnv.PRODUCTION_DATABASE_URL
	delete deployEnv.DATABASE_URL
	const migrationEnv = { ...deployEnv, PRODUCTION_DATABASE_URL: databaseUrl }

	run(["exec", "wrangler", "whoami"], deployEnv)
	run(["build"], deployEnv)
	run(["exec", "wrangler", "deploy", "--dry-run", ...secretsArgs], deployEnv)
	run(
		[
			"exec",
			"dbmate",
			"--env",
			"PRODUCTION_DATABASE_URL",
			"--env-file",
			"/dev/null",
			"--no-dump-schema",
			"migrate",
		],
		migrationEnv,
	)
	run(
		[
			"exec",
			"dbmate",
			"--env",
			"PRODUCTION_DATABASE_URL",
			"--env-file",
			"/dev/null",
			"--no-dump-schema",
			"status",
		],
		migrationEnv,
	)
	run(["exec", "wrangler", "deploy", ...secretsArgs], deployEnv)
} catch (error) {
	console.error(error instanceof Error ? error.message : "Deployment failed")
	process.exitCode = 1
}
