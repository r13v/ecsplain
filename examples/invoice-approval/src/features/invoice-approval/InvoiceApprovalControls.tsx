import type { Entity } from "ecsplain"
import { useComponent, useWorld } from "ecsplain/react"
import { CanApprove, InvoiceSnapshot } from "../invoice-workspace"
import {
	ApprovalEnabled,
	ApprovalError,
	ApprovalReview,
	PendingApproval,
} from "./model"
import {
	cancelInvoiceApprovalReview,
	confirmInvoiceApprovalReview,
	type InvoiceApprovalCommand,
	requestInvoiceApproval,
} from "./systems"

export type InvoiceApprovalSubmit = (command: InvoiceApprovalCommand) => void

export interface InvoiceApprovalControlsProps {
	readonly invoice: Entity
	readonly invoiceNumber: string
	readonly workspaceEntity: Entity
	readonly onSubmit: InvoiceApprovalSubmit
}

export function InvoiceApprovalControls({
	invoice,
	invoiceNumber,
	workspaceEntity,
	onSubmit,
}: InvoiceApprovalControlsProps) {
	const world = useWorld()
	const approvalEnabled =
		useComponent(workspaceEntity, ApprovalEnabled) ?? false
	const snapshot = useComponent(invoice, InvoiceSnapshot)
	const canApprove = useComponent(invoice, CanApprove) === true
	const pending = useComponent(invoice, PendingApproval) === true
	const review = useComponent(invoice, ApprovalReview) === true
	const error = useComponent(invoice, ApprovalError)

	if (!approvalEnabled || snapshot === undefined) {
		return null
	}

	const approvalAvailable = snapshot.status === "pending" && canApprove
	const requestApproval = () => {
		const command = world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice,
		})
		if (command !== undefined) {
			onSubmit(command)
		}
	}
	const confirmApproval = () => {
		const command = world.run(confirmInvoiceApprovalReview, { invoice })
		if (command !== undefined) {
			onSubmit(command)
		}
	}
	const cancelReview = () => {
		world.run(cancelInvoiceApprovalReview, { invoice })
	}

	return (
		<div className="approval-controls">
			{pending && <p className="approval-note">Approval pending</p>}
			{error && (
				<p className="approval-alert" role="alert">
					{error.message}
				</p>
			)}
			{review && (
				<div className="review-panel">
					<p>Review required</p>
					<div className="approval-actions">
						<button
							className="primary-button"
							type="button"
							onClick={confirmApproval}
						>
							Confirm approval for {invoiceNumber}
						</button>
						<button
							className="secondary-button"
							type="button"
							onClick={cancelReview}
						>
							Cancel approval for {invoiceNumber}
						</button>
					</div>
				</div>
			)}
			{approvalAvailable && !review && (
				<button
					className="primary-button"
					type="button"
					disabled={pending}
					onClick={requestApproval}
				>
					Approve {invoiceNumber}
				</button>
			)}
			{!approvalAvailable && !pending && (
				<p className="approval-note">No approval action available</p>
			)}
		</div>
	)
}
