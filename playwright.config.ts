import { defineConfig, devices } from "@playwright/test"

export default defineConfig({
	testDir: "./e2e",
	fullyParallel: false,
	retries: process.env.CI ? 2 : 0,
	reporter: "html",
	use: {
		screenshot: "only-on-failure",
		trace: "on-first-retry",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"], channel: "chromium" },
		},
	],
	webServer: [
		{
			command: "npm run dev:table -- --host 127.0.0.1 --port 4173 --strictPort",
			port: 4173,
			reuseExistingServer: !process.env.CI,
		},
		{
			command: "npm run dev:form -- --host 127.0.0.1 --port 4174 --strictPort",
			port: 4174,
			reuseExistingServer: !process.env.CI,
		},
		{
			command:
				"npm run dev:invoice -- --host 127.0.0.1 --port 4175 --strictPort",
			port: 4175,
			reuseExistingServer: !process.env.CI,
		},
	],
})
