import type { QueryClient } from "@tanstack/react-query"
import type { World } from "ecsplain"
import {
	type InvoiceDto,
	type InvoiceQueryData,
	type InvoiceWorkspace,
	invoiceQueryKey,
} from "../invoice-workspace"
import { InvoiceApiError, type InvoiceApprovalApi } from "./api"
import {
	type ApplyInvoiceApprovalSuccessResult,
	applyInvoiceApprovalFailure,
	applyInvoiceApprovalSuccess,
	type InvoiceApprovalCommand,
} from "./systems"

export interface SubmitInvoiceApprovalInput {
	readonly api: InvoiceApprovalApi
	readonly command: InvoiceApprovalCommand
	readonly queryClient: QueryClient
	readonly workspace: InvoiceWorkspace
	readonly world: World
}

export async function submitInvoiceApproval({
	api,
	command,
	queryClient,
	workspace,
	world,
}: SubmitInvoiceApprovalInput): Promise<ApplyInvoiceApprovalSuccessResult> {
	await queryClient.cancelQueries({ queryKey: invoiceQueryKey })

	let approvedInvoice: InvoiceDto
	try {
		approvedInvoice = await api.approveInvoice(command.invoiceId)
	} catch (error) {
		world.run(applyInvoiceApprovalFailure, {
			command,
			message: approvalFailureMessage(error),
		})
		await queryClient.invalidateQueries({ queryKey: invoiceQueryKey })
		throw error
	}

	const result = world.run(applyInvoiceApprovalSuccess, {
		workspace,
		command,
		invoice: approvedInvoice,
	})

	if (result.applied) {
		queryClient.setQueryData<InvoiceQueryData>(invoiceQueryKey, current =>
			mergeApprovedInvoice(current, approvedInvoice),
		)
	}

	await queryClient.invalidateQueries({ queryKey: invoiceQueryKey })
	return result
}

function mergeApprovedInvoice(
	current: InvoiceQueryData | undefined,
	approvedInvoice: InvoiceDto,
): InvoiceQueryData | undefined {
	if (current === undefined) {
		return current
	}

	let didReplace = false
	const items = current.items.map(item => {
		if (item.id !== approvedInvoice.id) {
			return item
		}

		if (approvedInvoice.version <= item.version) {
			return item
		}

		didReplace = true
		return approvedInvoice
	})

	if (!didReplace) {
		return current
	}

	return { ...current, items }
}

function approvalFailureMessage(error: unknown): string {
	if (error instanceof InvoiceApiError) {
		return error.message
	}

	return "Approval request failed"
}
