import {
	useQueryClient,
	useQuery as useTanStackQuery,
} from "@tanstack/react-query"
import type { Entity } from "ecsplain"
import { useQuery as useWorldQuery } from "ecsplain/react"
import type { ReactNode } from "react"
import { RenderableInvoices } from "./model"
import type { InvoiceQueryOptions } from "./queries"
import { invoiceQueryKey } from "./queries"

interface RenderApprovalControlsInput {
	readonly invoice: Entity
	readonly invoiceNumber: string
}

export interface InvoiceWorkspaceProps {
	readonly queryOptions: InvoiceQueryOptions
	readonly renderApprovalControls: (
		input: RenderApprovalControlsInput,
	) => ReactNode
}

export function InvoiceWorkspace({
	queryOptions,
	renderApprovalControls,
}: InvoiceWorkspaceProps) {
	const queryClient = useQueryClient()
	const query = useTanStackQuery(queryOptions)
	const invoices = [...useWorldQuery(RenderableInvoices)].sort(
		([, , left], [, , right]) => left.number.localeCompare(right.number),
	)

	const refreshInvoices = () => {
		void queryClient.invalidateQueries({ queryKey: invoiceQueryKey })
	}

	return (
		<section className="workspace-section" aria-label="Approval queue">
			<div className="workspace-toolbar">
				<div>
					<p className="section-label">Approval queue</p>
					<p className="workspace-status" role="status" aria-live="polite">
						{queryStatusText(query, invoices.length)}
					</p>
				</div>
				<button
					className="secondary-button"
					type="button"
					onClick={refreshInvoices}
				>
					Refresh invoices
				</button>
			</div>

			{query.isError && (
				<p className="global-alert" role="alert">
					Refresh failed: {errorMessage(query.error)}
				</p>
			)}

			{invoices.length === 0 ? (
				<div className="empty-state">{emptyStateText(query)}</div>
			) : (
				<div className="invoice-list">
					{invoices.map(([entity, invoiceId, snapshot, canApprove]) => (
						<article
							className="invoice-row"
							data-testid={`invoice-row-${snapshot.number}`}
							key={invoiceId}
							aria-labelledby={`invoice-${invoiceId}`}
						>
							<header className="invoice-row-header">
								<div>
									<p className="invoice-number" id={`invoice-${invoiceId}`}>
										{snapshot.number}
									</p>
									<p className="invoice-vendor">{snapshot.vendor}</p>
								</div>
								<span
									className={`status-badge status-badge-${snapshot.status}`}
								>
									{statusLabel(snapshot.status)}
								</span>
							</header>

							<dl className="invoice-facts">
								<div>
									<dt>Amount</dt>
									<dd>{formatCents(snapshot.amountCents)}</dd>
								</div>
								<div>
									<dt>Version</dt>
									<dd>{snapshot.version}</dd>
								</div>
								<div>
									<dt>Capability</dt>
									<dd>
										{canApprove === true
											? "Approval available"
											: "Approval unavailable"}
									</dd>
								</div>
							</dl>

							{renderApprovalControls({
								invoice: entity,
								invoiceNumber: snapshot.number,
							})}
						</article>
					))}
				</div>
			)}
		</section>
	)
}

function queryStatusText(
	query: InvoiceQueryStatus,
	invoiceCount: number,
): string {
	if (query.isPending && invoiceCount === 0) {
		return "Loading invoices"
	}

	if (query.isError && invoiceCount === 0) {
		return `Unable to load invoices: ${errorMessage(query.error)}`
	}

	if (query.isFetching && invoiceCount > 0) {
		return "Refreshing invoices"
	}

	return `${invoiceCount} ${invoiceCount === 1 ? "invoice" : "invoices"} loaded`
}

function emptyStateText(query: InvoiceQueryStatus): string {
	if (query.isPending) {
		return "Loading invoices"
	}

	if (query.isError) {
		return "Unable to load invoices"
	}

	return "No invoices loaded."
}

interface InvoiceQueryStatus {
	readonly error: Error | null
	readonly isError: boolean
	readonly isFetching: boolean
	readonly isPending: boolean
}

function errorMessage(error: Error | null): string {
	return error?.message ?? "Unable to load invoices"
}

function statusLabel(status: string): string {
	return status.charAt(0).toUpperCase() + status.slice(1)
}

function formatCents(amountCents: number): string {
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: "USD",
	}).format(amountCents / 100)
}
