import { QueryClientProvider } from "@tanstack/react-query"
import { WorldProvider } from "ecsplain/react"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { resolveInvoiceExampleConfig } from "./app/config"
import { createInvoiceExample } from "./app/create-example"
import "./styles.css"

async function startMockWorker(apiBaseUrl: URL): Promise<() => void> {
	const { startInvoiceMockWorker } = await import("./mocks/browser")
	return startInvoiceMockWorker(apiBaseUrl)
}

function App() {
	return (
		<main className="invoice-shell" aria-labelledby="invoice-title">
			<section className="workspace-header">
				<p className="eyebrow">Finance operations</p>
				<h1 id="invoice-title">Invoice approvals</h1>
				<p>Workspace initialization complete.</p>
			</section>
			<section className="workspace-panel" aria-label="Approval queue">
				<p className="panel-label">Approval queue</p>
				<p className="empty-state">No invoices loaded.</p>
			</section>
		</main>
	)
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
				<App />
			</WorldProvider>
		</QueryClientProvider>
	</StrictMode>,
)
