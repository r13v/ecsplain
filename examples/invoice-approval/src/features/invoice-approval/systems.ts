import type { Entity, System, World } from "ecsplain"
import type { InvoiceDto } from "../invoice-workspace"
import {
	applyInvoiceSnapshot,
	CanApprove,
	InvoiceId,
	InvoiceSnapshot,
	type InvoiceWorkspace,
} from "../invoice-workspace"
import {
	ApprovalEnabled,
	ApprovalError,
	ApprovalReview,
	ApprovalVariant,
	PendingApproval,
} from "./model"

export interface InvoiceApprovalCommand {
	readonly invoice: Entity
	readonly invoiceId: string
}

export interface RequestInvoiceApprovalInput {
	readonly workspace: Entity
	readonly invoice: Entity
}

export interface InvoiceApprovalInput {
	readonly invoice: Entity
}

export interface ApplyInvoiceApprovalSuccessInput {
	readonly workspace: InvoiceWorkspace
	readonly command: InvoiceApprovalCommand
	readonly invoice: InvoiceDto
}

export interface ApplyInvoiceApprovalSuccessResult {
	readonly applied: boolean
}

export interface ApplyInvoiceApprovalFailureInput {
	readonly command: InvoiceApprovalCommand
	readonly message: string
}

export const requestInvoiceApproval: System<
	RequestInvoiceApprovalInput,
	InvoiceApprovalCommand | undefined
> = (world, { workspace, invoice }) => {
	const command = approvalCommandForInvoice(world, invoice)
	if (command === undefined || world.get(workspace, ApprovalEnabled) !== true) {
		return undefined
	}

	world.remove(invoice, ApprovalError)
	if (world.require(workspace, ApprovalVariant) === "review") {
		world.set(invoice, ApprovalReview, true)
		return undefined
	}

	world.remove(invoice, ApprovalReview)
	world.set(invoice, PendingApproval, true)
	return command
}

export const confirmInvoiceApprovalReview: System<
	InvoiceApprovalInput,
	InvoiceApprovalCommand | undefined
> = (world, { invoice }) => {
	if (world.get(invoice, ApprovalReview) !== true) {
		return undefined
	}

	const command = approvalCommandForInvoice(world, invoice)
	if (command === undefined) {
		world.remove(invoice, ApprovalReview)
		return undefined
	}

	world.remove(invoice, ApprovalReview)
	world.remove(invoice, ApprovalError)
	world.set(invoice, PendingApproval, true)
	return command
}

export const cancelInvoiceApprovalReview: System<
	InvoiceApprovalInput,
	boolean
> = (world, { invoice }) => world.remove(invoice, ApprovalReview)

export const applyInvoiceApprovalSuccess: System<
	ApplyInvoiceApprovalSuccessInput,
	ApplyInvoiceApprovalSuccessResult
> = (world, { workspace, command, invoice }) => {
	if (invoice.id !== command.invoiceId) {
		throw new Error(
			`Approval response id "${invoice.id}" did not match "${command.invoiceId}"`,
		)
	}

	const result = world.run(applyInvoiceSnapshot, { workspace, invoice })
	clearTransientApprovalState(world, command.invoice)
	return { applied: result.applied }
}

export const applyInvoiceApprovalFailure: System<
	ApplyInvoiceApprovalFailureInput
> = (world, { command, message }) => {
	world.remove(command.invoice, PendingApproval)
	world.remove(command.invoice, ApprovalReview)
	world.set(command.invoice, ApprovalError, {
		message: normalizeApprovalError(message),
	})
}

function approvalCommandForInvoice(
	world: World,
	invoice: Entity,
): InvoiceApprovalCommand | undefined {
	if (world.get(invoice, PendingApproval) === true) {
		return undefined
	}

	const snapshot = world.get(invoice, InvoiceSnapshot)
	if (
		snapshot?.status !== "pending" ||
		world.get(invoice, CanApprove) !== true
	) {
		return undefined
	}

	const invoiceId = world.get(invoice, InvoiceId)
	if (invoiceId === undefined) {
		return undefined
	}

	return { invoice, invoiceId }
}

function clearTransientApprovalState(world: World, invoice: Entity): void {
	world.remove(invoice, PendingApproval)
	world.remove(invoice, ApprovalReview)
	world.remove(invoice, ApprovalError)
}

function normalizeApprovalError(message: string): string {
	return message.trim() || "Approval request failed"
}
