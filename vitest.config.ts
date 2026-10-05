import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src/react-app", import.meta.url)),
		},
	},
	plugins: [react()],
	test: {
		environment: "node",
		include: ["src/**/*.test.{ts,tsx}"],
		setupFiles: ["./src/react-app/test/setup.ts"],
	},
})
