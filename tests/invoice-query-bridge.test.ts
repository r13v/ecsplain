import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { createWorld } from "ecsplain"
import { setupServer } from "msw/node"
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
} from "vitest"
import {
	ApprovalError,
	ApprovalReview,
	PendingApproval,
} from "../examples/invoice-approval/src/features/invoice-approval"
import {
	createInvoiceApi,
	createInvoiceQueryOptions,
	createInvoiceWorkspace,
	type InvoiceDto,
	InvoiceSnapshot,
	type InvoiceWorkspace,
	RenderableInvoices,
	startInvoiceQueryBridge,
} from "../examples/invoice-approval/src/features/invoice-workspace"
import {
	createMockInvoiceStore,
	type MockInvoiceStore,
} from "../examples/invoice-approval/src/mocks/data"
import { createInvoiceHandlers } from "../examples/invoice-approval/src/mocks/handlers"

const apiBaseUrl = new URL("http://invoice.test/api/")

let store: MockInvoiceStore = createMockInvoiceStore()
const server = setupServer(
	...createInvoiceHandlers({ baseUrl: apiBaseUrl, store }),
)

function invoice(overrides: Partial<InvoiceDto> = {}): InvoiceDto {
	return {
		id: "invoice-1",
		number: "INV-001",
		vendor: "Northwind Traders",
		amountCents: 12_500,
		status: "pending",
		version: 1,
		canApprove: true,
		...overrides,
	}
}

function createQueryClient(): QueryClient {
	return new QueryClient({
		defaultOptions: {
			queries: {
				retry: false,
			},
		},
	})
}

function createBridgeFixture(): {
	readonly queryClient: QueryClient
	readonly workspace: InvoiceWorkspace
	readonly world: ReturnType<typeof createWorld>
	readonly stopBridge: () => void
} {
	const queryClient = createQueryClient()
	const world = createWorld()
	const workspace = createInvoiceWorkspace(world)
	const queryOptions = createInvoiceQueryOptions(createInvoiceApi(apiBaseUrl))
	const stopBridge = startInvoiceQueryBridge({
		queryClient,
		queryOptions,
		world,
		workspace,
	})

	return { queryClient, world, workspace, stopBridge }
}

beforeAll(() => {
	server.listen({ onUnhandledRequest: "error" })
})

beforeEach(() => {
	store = createMockInvoiceStore()
	server.resetHandlers(...createInvoiceHandlers({ baseUrl: apiBaseUrl, store }))
})

afterEach(() => {
	server.resetHandlers()
})

afterAll(() => {
	server.close()
})

describe("invoice query bridge", () => {
	it("uses one GET when the UI observer and ECS bridge share query options", async () => {
		const queryClient = createQueryClient()
		const world = createWorld()
		const workspace = createInvoiceWorkspace(world)
		const queryOptions = createInvoiceQueryOptions(createInvoiceApi(apiBaseUrl))
		const stopBridge = startInvoiceQueryBridge({
			queryClient,
			queryOptions,
			world,
			workspace,
		})
		const uiObserver = new QueryObserver(queryClient, queryOptions)
		const stopUiObserver = uiObserver.subscribe(() => {})

		await expect
			.poll(() => queryClient.getQueryData(queryOptions.queryKey))
			.toEqual({
				items: store.currentInvoices(),
			})

		expect(store.listRequests).toBe(1)
		expect(world.query(RenderableInvoices)).toHaveLength(3)

		stopUiObserver()
		stopBridge()
		queryClient.clear()
	})

	it("reconciles newer cache results without removing transient approval state", () => {
		const { queryClient, world, workspace, stopBridge } = createBridgeFixture()

		queryClient.setQueryData(
			createInvoiceQueryOptions(createInvoiceApi(apiBaseUrl)).queryKey,
			{
				items: [invoice()],
			},
		)
		const entity = workspace.invoiceById.get("invoice-1")
		if (entity === undefined) {
			throw new Error("Expected invoice-1 to be reconciled")
		}
		world.set(entity, ApprovalReview, true)
		world.set(entity, PendingApproval, true)
		world.set(entity, ApprovalError, { message: "Still visible" })

		queryClient.setQueryData(
			createInvoiceQueryOptions(createInvoiceApi(apiBaseUrl)).queryKey,
			{
				items: [
					invoice({
						vendor: "Updated Vendor",
						version: 2,
						canApprove: false,
					}),
				],
			},
		)

		expect(world.require(entity, InvoiceSnapshot)).toMatchObject({
			vendor: "Updated Vendor",
			version: 2,
		})
		expect(world.require(entity, ApprovalReview)).toBe(true)
		expect(world.require(entity, PendingApproval)).toBe(true)
		expect(world.require(entity, ApprovalError)).toEqual({
			message: "Still visible",
		})

		stopBridge()
		queryClient.clear()
	})

	it("observes different same-tick cache values instead of deduplicating by updatedAt", () => {
		const { queryClient, world, workspace, stopBridge } = createBridgeFixture()
		const queryKey = createInvoiceQueryOptions(
			createInvoiceApi(apiBaseUrl),
		).queryKey

		queryClient.setQueryData(
			queryKey,
			{
				items: [
					invoice({ version: 2 }),
					invoice({
						id: "invoice-2",
						number: "INV-002",
						vendor: "Tailspin Toys",
						version: 1,
					}),
				],
			},
			{ updatedAt: 10 },
		)
		queryClient.setQueryData(
			queryKey,
			{
				items: [invoice({ vendor: "Same Tick Winner", version: 3 })],
			},
			{ updatedAt: 10 },
		)

		const first = workspace.invoiceById.get("invoice-1")
		const second = workspace.invoiceById.get("invoice-2")
		if (first === undefined || second === undefined) {
			throw new Error("Expected both same-tick cache values to reconcile")
		}
		expect(world.require(first, InvoiceSnapshot)).toMatchObject({
			vendor: "Same Tick Winner",
			version: 3,
		})
		expect(world.require(second, InvoiceSnapshot)).toMatchObject({
			vendor: "Tailspin Toys",
			version: 1,
		})

		stopBridge()
		queryClient.clear()
	})

	it("rejects non-2xx list responses before parsing successful data", async () => {
		server.resetHandlers(
			...createInvoiceHandlers({
				baseUrl: apiBaseUrl,
				store,
				listStatus: 503,
			}),
		)
		const queryClient = createQueryClient()
		const queryOptions = createInvoiceQueryOptions(createInvoiceApi(apiBaseUrl))

		await expect(queryClient.fetchQuery(queryOptions)).rejects.toThrow(
			"Failed to load invoices (503)",
		)

		queryClient.clear()
	})
})
