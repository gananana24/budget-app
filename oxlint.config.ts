import { defineConfig } from "oxlint"

export default defineConfig({
	ignorePatterns: [
		"src/react-app/paraglide/**",
		"src/react-app/app/route-tree.gen.ts",
		"src/react-app/components/ui/**",
		"src/react-app/lib/utils.ts",
	],
	categories: {
		correctness: "error",
		suspicious: "error",
	},
	plugins: ["typescript", "react", "vitest"],
	rules: {
		"react/react-in-jsx-scope": "off",
		"react/no-unstable-nested-components": "off",
		"vitest/no-conditional-expect": "off",
	},
	overrides: [
		{
			files: ["src/react-app/app/routes/_app.tsx"],
			rules: {
				"react/exhaustive-effect-dependencies": "off",
			},
		},
	],
	options: {
		maxWarnings: 0,
	},
})
