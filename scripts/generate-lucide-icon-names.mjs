import { writeFileSync } from "node:fs"
import { iconNames } from "lucide-react/dynamic.mjs"

writeFileSync(
	"src/shared/lucide-icon-names.ts",
	`// Generated from lucide-react dynamic icon names. Run pnpm icons:sync after upgrading lucide-react.\nexport const lucideIconNames = ${JSON.stringify(iconNames, null, 2)} as const\n`,
)
