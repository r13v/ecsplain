import type { ApprovalVariantData } from "../features/invoice-approval"

export interface InvoiceExampleConfig {
	readonly approvalEnabled: boolean
	readonly approvalVariant: ApprovalVariantData
}

export function resolveInvoiceExampleConfig(url: URL): InvoiceExampleConfig {
	return {
		approvalEnabled: url.searchParams.get("approval") !== "off",
		approvalVariant:
			url.searchParams.get("variant") === "review" ? "review" : "direct",
	}
}
