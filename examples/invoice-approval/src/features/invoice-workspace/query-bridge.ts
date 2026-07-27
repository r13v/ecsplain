import { type QueryClient, QueryObserver } from "@tanstack/react-query"
import type { World } from "ecsplain"
import type {
	InvoiceQueryData,
	InvoiceQueryKey,
	InvoiceQueryOptions,
} from "./queries"
import { type InvoiceWorkspace, reconcileInvoices } from "./systems"

export interface StartInvoiceQueryBridgeInput {
	readonly queryClient: QueryClient
	readonly queryOptions: InvoiceQueryOptions
	readonly world: World
	readonly workspace: InvoiceWorkspace
}

export function startInvoiceQueryBridge({
	queryClient,
	queryOptions,
	world,
	workspace,
}: StartInvoiceQueryBridgeInput): () => void {
	const observer = new QueryObserver<
		InvoiceQueryData,
		Error,
		InvoiceQueryData,
		InvoiceQueryData,
		InvoiceQueryKey
	>(queryClient, queryOptions)
	let lastAppliedData: InvoiceQueryData | undefined

	const reconcile = (data: InvoiceQueryData | undefined): void => {
		if (data === undefined || Object.is(data, lastAppliedData)) {
			return
		}

		lastAppliedData = data
		world.run(reconcileInvoices, { workspace, response: data })
	}

	const unsubscribe = observer.subscribe(result => {
		if (result.isSuccess) {
			reconcile(result.data)
		}
	})
	const current = observer.getCurrentResult()
	if (current.isSuccess) {
		reconcile(current.data)
	}

	return unsubscribe
}
