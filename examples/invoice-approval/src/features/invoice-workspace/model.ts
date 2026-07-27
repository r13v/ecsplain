import { defineComponent, defineQuery, optional } from "ecsplain"
import type { InvoiceStatus } from "./api"

export interface InvoiceSnapshotData {
	readonly number: string
	readonly vendor: string
	readonly amountCents: number
	readonly status: InvoiceStatus
	readonly version: number
}

export const InvoiceId = defineComponent<string>("InvoiceId")
export const InvoiceSnapshot =
	defineComponent<InvoiceSnapshotData>("InvoiceSnapshot")
export const CanApprove = defineComponent<true>("CanApprove")

export const RenderableInvoices = defineQuery(
	InvoiceId,
	InvoiceSnapshot,
	optional(CanApprove),
)
