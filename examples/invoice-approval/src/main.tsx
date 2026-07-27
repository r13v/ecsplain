import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import "./styles.css"

async function startMockWorker(): Promise<void> {
	if (!import.meta.env.DEV) {
		return
	}

	const { setupWorker } = await import("msw/browser")
	const worker = setupWorker()

	await worker.start({
		onUnhandledRequest: "bypass",
		serviceWorker: {
			url: "/mockServiceWorker.js",
		},
	})
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

const queryClient = new QueryClient()

await startMockWorker()

createRoot(rootElement).render(
	<StrictMode>
		<QueryClientProvider client={queryClient}>
			<App />
		</QueryClientProvider>
	</StrictMode>,
)
