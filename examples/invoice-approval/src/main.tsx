import { QueryClientProvider } from "@tanstack/react-query"
import { WorldProvider } from "ecsplain/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./app/App"
import { resolveInvoiceExampleConfig } from "./app/config"
import { createInvoiceExample } from "./app/create-example"
import "./styles.css"

const rootElement = document.getElementById("root")
if (rootElement === null) {
	throw new Error("The invoice approval example requires a #root element")
}

const exampleBaseUrl = new URL(import.meta.env.BASE_URL, window.location.origin)
const apiBaseUrl = new URL("api/", exampleBaseUrl)
const serviceWorkerUrl = new URL("mockServiceWorker.js", exampleBaseUrl)
const { startInvoiceMockWorker } = await import("./mocks/browser")
const stopMockWorker = await startInvoiceMockWorker(
	apiBaseUrl,
	serviceWorkerUrl,
)
const example = createInvoiceExample({
	apiBaseUrl,
	config: resolveInvoiceExampleConfig(new URL(window.location.href)),
})
const dispose = () => {
	example.dispose()
	stopMockWorker()
}

window.addEventListener("pagehide", dispose, { once: true })

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={example.queryClient}>
			<WorldProvider world={example.world}>
				<App example={example} />
			</WorldProvider>
		</QueryClientProvider>
	</StrictMode>,
)
