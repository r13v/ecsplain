import type {
	InvoiceDto,
	InvoiceListResponse,
} from "../features/invoice-workspace"

export interface MockInvoiceStore {
	readonly listRequests: number
	approveInvoice(invoiceId: string): MockInvoiceApprovalResult
	currentInvoices(): readonly InvoiceDto[]
	listInvoices(): InvoiceListResponse
}

type MockInvoiceApprovalResult =
	| {
			readonly ok: true
			readonly invoice: InvoiceDto
	  }
	| {
			readonly ok: false
			readonly status: number
			readonly error: MockInvoiceApprovalError
	  }

interface MockInvoiceApprovalError {
	readonly message: string
}

export function createMockInvoiceStore(
	initialInvoices: readonly InvoiceDto[] = defaultMockInvoices,
): MockInvoiceStore {
	let listRequests = 0
	let invoices = copyInvoices(initialInvoices)

	return {
		get listRequests() {
			return listRequests
		},
		approveInvoice(invoiceId) {
			const invoiceIndex = invoices.findIndex(
				invoice => invoice.id === invoiceId,
			)
			const current = invoices[invoiceIndex]

			if (current === undefined) {
				return {
					ok: false,
					status: 404,
					error: { message: `Invoice ${invoiceId} was not found` },
				}
			}

			if (current.id === "invoice-2") {
				return {
					ok: false,
					status: 409,
					error: {
						message: "Invoice INV-002 requires manual review before approval",
					},
				}
			}

			if (current.status !== "pending" || !current.canApprove) {
				return {
					ok: false,
					status: 409,
					error: {
						message: `Invoice ${current.number} is no longer approvable`,
					},
				}
			}

			const approved: InvoiceDto = {
				...current,
				status: "approved",
				version: current.version + 1,
				canApprove: false,
			}
			invoices = invoices.map(invoice =>
				invoice.id === invoiceId ? approved : invoice,
			)

			return { ok: true, invoice: { ...approved } }
		},
		currentInvoices() {
			return copyInvoices(invoices)
		},
		listInvoices() {
			listRequests += 1
			return { items: copyInvoices(invoices) }
		},
	}
}

const defaultMockInvoices: readonly InvoiceDto[] = [
	{
		id: "invoice-1",
		number: "INV-001",
		vendor: "Northwind Traders",
		amountCents: 12_500,
		status: "pending",
		version: 1,
		canApprove: true,
	},
	{
		id: "invoice-2",
		number: "INV-002",
		vendor: "Tailspin Toys",
		amountCents: 8_900,
		status: "pending",
		version: 1,
		canApprove: true,
	},
	{
		id: "invoice-3",
		number: "INV-003",
		vendor: "Contoso Services",
		amountCents: 21_400,
		status: "approved",
		version: 1,
		canApprove: false,
	},
]

function copyInvoices(invoices: readonly InvoiceDto[]): InvoiceDto[] {
	return invoices.map(invoice => ({ ...invoice }))
}
