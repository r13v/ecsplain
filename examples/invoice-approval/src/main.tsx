import { QueryClientProvider } from "@tanstack/react-query"
import { WorldProvider } from "ecsplain/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { App } from "./app/App"
import { resolveInvoiceExampleConfig } from "./app/config"
import { createInvoiceExample } from "./app/create-example"
import "./styles.css"

async function startMockWorker(apiBaseUrl: URL): Promise<() => void> {
	const { startInvoiceMockWorker } = await import("./mocks/browser")
	return startInvoiceMockWorker(apiBaseUrl)
}

const rootElement = document.getElementById("root")
if (rootElement === null) {
	throw new Error("The invoice approval example requires a #root element")
}

const apiBaseUrl = new URL("/api/", window.location.origin)
const stopMockWorker = await startMockWorker(apiBaseUrl)
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
