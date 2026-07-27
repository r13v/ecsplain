import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	resolve: {
		alias: [
			{
				find: "ecsplain/react",
				replacement: path.resolve(rootDirectory, "src/react/index.ts"),
			},
			{
				find: "ecsplain",
				replacement: path.resolve(rootDirectory, "src/index.ts"),
			},
		],
	},
	test: {
		include: ["tests/**/*.{test,spec}.{ts,tsx}"],
		exclude: ["e2e/**", "node_modules/**"],
	},
})
