import { QueryClient } from "@tanstack/react-query"
import {
	createWorld,
	type Entity,
	type SystemMiddleware,
	type World,
} from "ecsplain"
import {
	ApprovalEnabled,
	ApprovalVariant,
	createInvoiceApprovalApi,
	type InvoiceApprovalApi,
} from "../features/invoice-approval"
import {
	createInvoiceApi,
	createInvoiceQueryOptions,
	createInvoiceWorkspace,
	type InvoiceApi,
	type InvoiceQueryOptions,
	type InvoiceWorkspace,
	startInvoiceQueryBridge,
} from "../features/invoice-workspace"
import { createTracingMiddleware } from "../instrumentation/tracing-middleware"
import type { InvoiceExampleConfig } from "./config"

export interface CreateInvoiceExampleInput {
	readonly apiBaseUrl: URL
	readonly config: InvoiceExampleConfig
	readonly middleware?: readonly SystemMiddleware[]
}

export interface InvoiceExample {
	readonly apiBaseUrl: URL
	readonly approvalApi: InvoiceApprovalApi
	readonly invoiceApi: InvoiceApi
	readonly queryClient: QueryClient
	readonly queryOptions: InvoiceQueryOptions
	readonly workspace: InvoiceWorkspace
	readonly workspaceEntity: Entity
	readonly world: World
	dispose(): void
}

export function createInvoiceExample({
	apiBaseUrl,
	config,
	middleware,
}: CreateInvoiceExampleInput): InvoiceExample {
	const queryClient = new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})
	const world = createWorld({
		middleware: middleware ?? [createTracingMiddleware()],
	})
	const workspace = createInvoiceWorkspace(world)
	const workspaceEntity = world.create()
	world.set(workspaceEntity, ApprovalEnabled, config.approvalEnabled)
	world.set(workspaceEntity, ApprovalVariant, config.approvalVariant)

	const invoiceApi = createInvoiceApi(apiBaseUrl)
	const approvalApi = createInvoiceApprovalApi(apiBaseUrl)
	const queryOptions = createInvoiceQueryOptions(invoiceApi)
	const stopBridge = startInvoiceQueryBridge({
		queryClient,
		queryOptions,
		world,
		workspace,
	})
	let disposed = false

	return {
		apiBaseUrl,
		approvalApi,
		invoiceApi,
		queryClient,
		queryOptions,
		workspace,
		workspaceEntity,
		world,
		dispose() {
			if (disposed) {
				return
			}

			disposed = true
			stopBridge()
			queryClient.clear()
		},
	}
}
