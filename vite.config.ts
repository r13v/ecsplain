import path from "node:path"
import { fileURLToPath } from "node:url"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const rootDirectory = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
	plugins: [react()],
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
})
