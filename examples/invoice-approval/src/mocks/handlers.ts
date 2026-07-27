import { delay, HttpResponse, http, type RequestHandler } from "msw"
import type { InvoiceListResponse } from "../features/invoice-workspace"
import type { MockInvoiceStore } from "./data"

export interface CreateInvoiceHandlersOptions {
	readonly baseUrl: URL
	readonly store: MockInvoiceStore
	readonly listStatus?: number
}

export function createInvoiceHandlers({
	baseUrl,
	store,
	listStatus = 200,
}: CreateInvoiceHandlersOptions): readonly RequestHandler[] {
	return [
		http.get(new URL("invoices", baseUrl).href, async () => {
			await delay(150)

			if (listStatus !== 200) {
				return new HttpResponse(null, { status: listStatus })
			}

			return HttpResponse.json<InvoiceListResponse>(store.listInvoices())
		}),
	]
}
