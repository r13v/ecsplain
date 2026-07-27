import { defineConfig } from "tsup"

export default defineConfig({
	clean: true,
	entry: {
		index: "src/index.ts",
		"react/index": "src/react/index.ts",
	},
	external: ["react", "react/jsx-runtime"],
	format: ["esm"],
	sourcemap: true,
	splitting: false,
	target: "es2023",
})
