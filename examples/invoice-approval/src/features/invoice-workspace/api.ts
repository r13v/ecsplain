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

			return parseInvoiceListResponse(await response.json())
		},
	}
}

function parseInvoiceListResponse(value: unknown): InvoiceListResponse {
	if (!isRecord(value) || !Array.isArray(value.items)) {
		throw invalidInvoiceResponse()
	}

	return { items: value.items.map(parseInvoiceDto) }
}

export function parseInvoiceDto(value: unknown): InvoiceDto {
	if (
		!isRecord(value) ||
		!isNonBlankString(value.id) ||
		typeof value.number !== "string" ||
		typeof value.vendor !== "string" ||
		!isNonNegativeSafeInteger(value.amountCents) ||
		!isInvoiceStatus(value.status) ||
		!isNonNegativeSafeInteger(value.version) ||
		typeof value.canApprove !== "boolean"
	) {
		throw invalidInvoiceResponse()
	}

	return {
		id: value.id,
		number: value.number,
		vendor: value.vendor,
		amountCents: value.amountCents,
		status: value.status,
		version: value.version,
		canApprove: value.canApprove,
	}
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isNonBlankString(value: unknown): value is string {
	return typeof value === "string" && value.trim().length > 0
}

function isNonNegativeSafeInteger(value: unknown): value is number {
	return typeof value === "number" && Number.isSafeInteger(value) && value >= 0
}

function isInvoiceStatus(value: unknown): value is InvoiceStatus {
	return value === "pending" || value === "approved" || value === "rejected"
}

function invalidInvoiceResponse(): Error {
	return new Error("Invalid invoice response")
}
