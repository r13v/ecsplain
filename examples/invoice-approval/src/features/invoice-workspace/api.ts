export type InvoiceStatus = "pending" | "approved" | "rejected"

export interface InvoiceDto {
	readonly id: string
	readonly number: string
	readonly vendor: string
	readonly amountCents: number
	readonly status: InvoiceStatus
	/**
	 * Monotonic per-invoice server version. The server increments this value for
	 * every server-visible change to the invoice.
	 */
	readonly version: number
	readonly canApprove: boolean
}

export interface InvoiceListResponse {
	readonly items: readonly InvoiceDto[]
}

export interface InvoiceApi {
	listInvoices(signal?: AbortSignal): Promise<InvoiceListResponse>
}

export function createInvoiceApi(baseUrl: URL): InvoiceApi {
	return {
		async listInvoices(signal) {
			const requestInit = signal === undefined ? undefined : { signal }
			const response = await fetch(new URL("invoices", baseUrl), requestInit)
			if (!response.ok) {
				throw new Error(`Failed to load invoices (${response.status})`)
			}

			return response.json() as Promise<InvoiceListResponse>
		},
	}
}
