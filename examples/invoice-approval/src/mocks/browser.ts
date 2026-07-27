import { setupWorker } from "msw/browser"
import { createMockInvoiceStore } from "./data"
import { createInvoiceHandlers } from "./handlers"

export async function startInvoiceMockWorker(
	baseUrl: URL,
): Promise<() => void> {
	const worker = setupWorker(
		...createInvoiceHandlers({
			baseUrl,
			store: createMockInvoiceStore(),
		}),
	)

	await worker.start({
		onUnhandledRequest: "error",
		serviceWorker: {
			url: "/mockServiceWorker.js",
		},
	})

	return () => {
		worker.stop()
	}
}
