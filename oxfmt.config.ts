import { defineConfig } from "oxfmt"

export default defineConfig({
	printWidth: 100,
	useTabs: true,
	semi: false,
	singleQuote: false,
	trailingComma: "all",
	sortImports: false,
	sortPackageJson: false,
	ignorePatterns: [
		"src/react-app/paraglide/**",
		"src/react-app/app/route-tree.gen.ts",
		"src/react-app/components/ui/**",
		"src/react-app/lib/utils.ts",
	],
})
