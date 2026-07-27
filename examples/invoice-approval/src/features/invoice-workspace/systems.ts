import type { Entity, System, UniqueSecondaryIndex, World } from "ecsplain"
import type { InvoiceDto, InvoiceListResponse } from "./api"
import {
	CanApprove,
	InvoiceId,
	InvoiceSnapshot,
	type InvoiceSnapshotData,
} from "./model"

export interface InvoiceWorkspace {
	readonly invoiceById: UniqueSecondaryIndex<string>
}

export interface ApplyInvoiceSnapshotInput {
	readonly workspace: InvoiceWorkspace
	readonly invoice: InvoiceDto
}

export interface ApplyInvoiceSnapshotResult {
	readonly entity: Entity
	readonly applied: boolean
}

export interface ReconcileInvoicesInput {
	readonly workspace: InvoiceWorkspace
	readonly response: InvoiceListResponse
}

export function createInvoiceWorkspace(world: World): InvoiceWorkspace {
	return {
		invoiceById: world.index(InvoiceId, { unique: true }),
	}
}

export const applyInvoiceSnapshot: System<
	ApplyInvoiceSnapshotInput,
	ApplyInvoiceSnapshotResult
> = (world, { workspace, invoice }) => {
	const existing = workspace.invoiceById.get(invoice.id)

	if (existing === undefined) {
		const entity = world.spawn(
			[InvoiceId, invoice.id],
			[InvoiceSnapshot, toInvoiceSnapshot(invoice)],
		)
		syncCanApprove(world, entity, invoice.canApprove)
		return { entity, applied: true }
	}

	const current = world.get(existing, InvoiceSnapshot)
	if (current !== undefined && invoice.version <= current.version) {
		return { entity: existing, applied: false }
	}

	world.set(existing, InvoiceSnapshot, toInvoiceSnapshot(invoice))
	syncCanApprove(world, existing, invoice.canApprove)
	return { entity: existing, applied: true }
}

export const reconcileInvoices: System<ReconcileInvoicesInput, number> = (
	world,
	{ workspace, response },
) => {
	let applied = 0

	for (const invoice of response.items) {
		const result = world.run(applyInvoiceSnapshot, { workspace, invoice })
		if (result.applied) {
			applied += 1
		}
	}

	return applied
}

function toInvoiceSnapshot(invoice: InvoiceDto): InvoiceSnapshotData {
	return {
		number: invoice.number,
		vendor: invoice.vendor,
		amountCents: invoice.amountCents,
		status: invoice.status,
		version: invoice.version,
	}
}

function syncCanApprove(
	world: World,
	entity: Entity,
	canApprove: boolean,
): void {
	if (canApprove) {
		world.set(entity, CanApprove, true)
		return
	}

	world.remove(entity, CanApprove)
}
