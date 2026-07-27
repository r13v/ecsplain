import { delay, HttpResponse, http, type RequestHandler } from "msw"
import type {
	InvoiceDto,
	InvoiceListResponse,
} from "../features/invoice-workspace"
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
		http.post(
			new URL("invoices/:invoiceId/approve", baseUrl).href,
			async ({ params }) => {
				await delay(250)

				const invoiceId = invoiceIdFromParams(params.invoiceId)
				if (invoiceId === undefined) {
					return HttpResponse.json(
						{ message: "Invoice id is required" },
						{ status: 400 },
					)
				}

				const result = store.approveInvoice(invoiceId)
				if (!result.ok) {
					return HttpResponse.json(result.error, { status: result.status })
				}

				return HttpResponse.json<InvoiceDto>(result.invoice)
			},
		),
	]
}

function invoiceIdFromParams(
	value: string | readonly string[] | undefined,
): string | undefined {
	if (typeof value === "string") {
		return value
	}

	return value?.[0]
}
