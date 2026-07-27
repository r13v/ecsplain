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
