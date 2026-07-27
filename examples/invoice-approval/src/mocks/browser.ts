import { setupWorker } from "msw/browser"
import { createMockInvoiceStore } from "./data"
import { createInvoiceHandlers } from "./handlers"

const store = createMockInvoiceStore()

export const worker = setupWorker(
	...createInvoiceHandlers({
		baseUrl: new URL("/api/", window.location.origin),
		store,
	}),
)
