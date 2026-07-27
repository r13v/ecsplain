import type { InvoiceDto } from "../invoice-workspace"

const fallbackApprovalMessage = "Approval request failed"

interface InvoiceApprovalErrorResponse {
	readonly message: string
}

export interface InvoiceApprovalApi {
	approveInvoice(invoiceId: string, signal?: AbortSignal): Promise<InvoiceDto>
}

export class InvoiceApiError extends Error {
	readonly status: number

	constructor(status: number, message: string) {
		super(normalizeApprovalMessage(message))
		this.name = "InvoiceApiError"
		this.status = status
	}
}

export function createInvoiceApprovalApi(baseUrl: URL): InvoiceApprovalApi {
	return {
		async approveInvoice(invoiceId, signal) {
			const requestInit =
				signal === undefined ? { method: "POST" } : { method: "POST", signal }
			const response = await fetch(
				new URL(`invoices/${encodeURIComponent(invoiceId)}/approve`, baseUrl),
				requestInit,
			)

			if (!response.ok) {
				throw new InvoiceApiError(
					response.status,
					await approvalErrorMessage(response),
				)
			}

			return response.json() as Promise<InvoiceDto>
		},
	}
}

async function approvalErrorMessage(response: Response): Promise<string> {
	try {
		const body =
			(await response.json()) as Partial<InvoiceApprovalErrorResponse>
		if (typeof body.message === "string") {
			return body.message
		}
	} catch {
		return fallbackApprovalMessage
	}

	return fallbackApprovalMessage
}

function normalizeApprovalMessage(message: string): string {
	return message.trim() || fallbackApprovalMessage
}
