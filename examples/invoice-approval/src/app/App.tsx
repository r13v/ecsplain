import { useQueryClient } from "@tanstack/react-query"
import { useComponent, useWorld } from "ecsplain/react"
import { ApprovalEnabled } from "../features/invoice-approval"
import {
	InvoiceApprovalControls,
	type InvoiceApprovalSubmit,
} from "../features/invoice-approval/InvoiceApprovalControls"
import { submitInvoiceApproval } from "../features/invoice-approval/mutation"
import { InvoiceWorkspace } from "../features/invoice-workspace/InvoiceWorkspace"
import type { InvoiceExample } from "./create-example"

export function App({ example }: { readonly example: InvoiceExample }) {
	const queryClient = useQueryClient()
	const world = useWorld()
	const approvalEnabled = useComponent(example.workspaceEntity, ApprovalEnabled)
	const submitApproval: InvoiceApprovalSubmit = command => {
		void submitInvoiceApproval({
			api: example.approvalApi,
			command,
			queryClient,
			workspace: example.workspace,
			world,
		}).catch(() => undefined)
	}

	return (
		<main className="invoice-shell" aria-labelledby="invoice-title">
			<header className="workspace-header">
				<div>
					<p className="eyebrow">Finance operations</p>
					<h1 id="invoice-title">Invoice approvals</h1>
				</div>
				{approvalEnabled === false && (
					<p className="rollout-notice">
						Approval rollout is disabled for this session.
					</p>
				)}
			</header>

			<InvoiceWorkspace
				queryOptions={example.queryOptions}
				renderApprovalControls={({ invoice, invoiceNumber }) => (
					<InvoiceApprovalControls
						invoice={invoice}
						invoiceNumber={invoiceNumber}
						workspaceEntity={example.workspaceEntity}
						onSubmit={submitApproval}
					/>
				)}
			/>
		</main>
	)
}
