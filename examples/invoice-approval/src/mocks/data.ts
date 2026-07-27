import type {
	InvoiceDto,
	InvoiceListResponse,
} from "../features/invoice-workspace"

export interface MockInvoiceStore {
	readonly listRequests: number
	currentInvoices(): readonly InvoiceDto[]
	listInvoices(): InvoiceListResponse
	replaceInvoices(invoices: readonly InvoiceDto[]): void
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
		currentInvoices() {
			return copyInvoices(invoices)
		},
		listInvoices() {
			listRequests += 1
			return { items: copyInvoices(invoices) }
		},
		replaceInvoices(nextInvoices) {
			invoices = copyInvoices(nextInvoices)
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
