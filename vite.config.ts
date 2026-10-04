import { fileURLToPath } from "node:url"
import { cloudflare } from "@cloudflare/vite-plugin"
import { paraglideVitePlugin } from "@inlang/paraglide-js"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
	resolve: {
		alias: {
			"@": fileURLToPath(new URL("./src/react-app", import.meta.url)),
		},
	},
	plugins: [
		tanstackRouter({
			routesDirectory: "./src/react-app/app/routes",
			generatedRouteTree: "./src/react-app/app/route-tree.gen.ts",
			autoCodeSplitting: false,
			quoteStyle: "double",
			semicolons: false,
		}),
		react(),
		tailwindcss(),
		paraglideVitePlugin({
			project: "./project.inlang",
			outdir: "./src/react-app/paraglide",
			emitTsDeclarations: true,
		}),
		cloudflare(),
	],
})
