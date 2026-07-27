import { QueryClient } from "@tanstack/react-query"
import type { Entity, World } from "ecsplain"
import { createWorld } from "ecsplain"
import { HttpResponse, http } from "msw"
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
	ApprovalEnabled,
	ApprovalError,
	ApprovalVariant,
	createInvoiceApprovalApi,
	InvoiceApiError,
	type InvoiceApprovalCommand,
	PendingApproval,
	requestInvoiceApproval,
	submitInvoiceApproval,
} from "../examples/invoice-approval/src/features/invoice-approval"
import {
	CanApprove,
	createInvoiceApi,
	createInvoiceQueryOptions,
	createInvoiceWorkspace,
	type InvoiceDto,
	type InvoiceListResponse,
	InvoiceSnapshot,
	type InvoiceWorkspace,
	invoiceQueryKey,
	reconcileInvoices,
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

interface MutationFixture {
	readonly command: InvoiceApprovalCommand
	readonly invoiceEntity: Entity
	readonly queryClient: QueryClient
	readonly workspace: InvoiceWorkspace
	readonly world: World
}

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

function createMutationFixture(
	initialInvoices: readonly InvoiceDto[] = store.currentInvoices(),
	invoiceId = "invoice-1",
): MutationFixture {
	const queryClient = createQueryClient()
	queryClient.setQueryData<InvoiceListResponse>(invoiceQueryKey, {
		items: initialInvoices,
	})

	const world = createWorld()
	const workspace = createInvoiceWorkspace(world)
	const workspaceEntity = world.create()
	world.set(workspaceEntity, ApprovalEnabled, true)
	world.set(workspaceEntity, ApprovalVariant, "direct")
	world.run(reconcileInvoices, {
		workspace,
		response: { items: initialInvoices },
	})

	const invoiceEntity = workspace.invoiceById.get(invoiceId)
	if (invoiceEntity === undefined) {
		throw new Error(`Expected ${invoiceId} to exist in the workspace`)
	}

	const command = world.run(requestInvoiceApproval, {
		workspace: workspaceEntity,
		invoice: invoiceEntity,
	})
	if (command === undefined) {
		throw new Error(`Expected ${invoiceId} to produce an approval command`)
	}

	return { command, invoiceEntity, queryClient, workspace, world }
}

function cachedInvoice(
	queryClient: QueryClient,
	invoiceId: string,
): InvoiceDto {
	const data = queryClient.getQueryData<InvoiceListResponse>(invoiceQueryKey)
	const cached = data?.items.find(item => item.id === invoiceId)
	if (cached === undefined) {
		throw new Error(`Expected ${invoiceId} in the query cache`)
	}

	return cached
}

function createDeferred<T = void>(): {
	readonly promise: Promise<T>
	readonly reject: (error: unknown) => void
	readonly resolve: (value: T | PromiseLike<T>) => void
} {
	let resolve!: (value: T | PromiseLike<T>) => void
	let reject!: (error: unknown) => void
	const promise = new Promise<T>((promiseResolve, promiseReject) => {
		resolve = promiseResolve
		reject = promiseReject
	})

	return { promise, reject, resolve }
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

describe("invoice approval mutation", () => {
	it("applies a successful approval to ECS before merging the newer DTO into Query cache", async () => {
		const fixture = createMutationFixture()

		const result = await submitInvoiceApproval({
			api: createInvoiceApprovalApi(apiBaseUrl),
			command: fixture.command,
			queryClient: fixture.queryClient,
			workspace: fixture.workspace,
			world: fixture.world,
		})

		expect(result).toEqual({ applied: true })
		expect(
			fixture.world.require(fixture.invoiceEntity, InvoiceSnapshot),
		).toEqual({
			number: "INV-001",
			vendor: "Northwind Traders",
			amountCents: 12_500,
			status: "approved",
			version: 2,
		})
		expect(
			fixture.world.get(fixture.invoiceEntity, PendingApproval),
		).toBeUndefined()
		expect(fixture.world.get(fixture.invoiceEntity, CanApprove)).toBeUndefined()
		expect(cachedInvoice(fixture.queryClient, "invoice-1")).toMatchObject({
			status: "approved",
			version: 2,
			canApprove: false,
		})
		expect(
			fixture.queryClient.getQueryState(invoiceQueryKey)?.isInvalidated,
		).toBe(true)

		fixture.queryClient.clear()
	})

	it("maps HTTP 409 responses into ECS failure state without adding optimistic Query cache data", async () => {
		const fixture = createMutationFixture(store.currentInvoices(), "invoice-2")

		await expect(
			submitInvoiceApproval({
				api: createInvoiceApprovalApi(apiBaseUrl),
				command: fixture.command,
				queryClient: fixture.queryClient,
				workspace: fixture.workspace,
				world: fixture.world,
			}),
		).rejects.toMatchObject({
			message: "Invoice INV-002 requires manual review before approval",
			status: 409,
		})

		await expect(
			createInvoiceApprovalApi(apiBaseUrl).approveInvoice("invoice-2"),
		).rejects.toBeInstanceOf(InvoiceApiError)
		expect(
			fixture.world.get(fixture.invoiceEntity, PendingApproval),
		).toBeUndefined()
		expect(fixture.world.require(fixture.invoiceEntity, ApprovalError)).toEqual(
			{
				message: "Invoice INV-002 requires manual review before approval",
			},
		)
		expect(cachedInvoice(fixture.queryClient, "invoice-2")).toMatchObject({
			status: "pending",
			version: 1,
			canApprove: true,
		})
		expect(
			fixture.queryClient.getQueryState(invoiceQueryKey)?.isInvalidated,
		).toBe(true)

		fixture.queryClient.clear()
	})

	it("maps generic approval failures into fallback ECS error state", async () => {
		const fixture = createMutationFixture()
		const networkError = new Error("Network unavailable")

		await expect(
			submitInvoiceApproval({
				api: {
					async approveInvoice() {
						throw networkError
					},
				},
				command: fixture.command,
				queryClient: fixture.queryClient,
				workspace: fixture.workspace,
				world: fixture.world,
			}),
		).rejects.toBe(networkError)

		expect(
			fixture.world.get(fixture.invoiceEntity, PendingApproval),
		).toBeUndefined()
		expect(fixture.world.require(fixture.invoiceEntity, ApprovalError)).toEqual(
			{
				message: "Approval request failed",
			},
		)
		expect(cachedInvoice(fixture.queryClient, "invoice-1")).toMatchObject({
			status: "pending",
			version: 1,
			canApprove: true,
		})
		expect(
			fixture.queryClient.getQueryState(invoiceQueryKey)?.isInvalidated,
		).toBe(true)

		fixture.queryClient.clear()
	})

	it("maps non-JSON and blank approval errors to the typed fallback message", async () => {
		server.resetHandlers(
			http.post(
				new URL("invoices/:invoiceId/approve", apiBaseUrl).href,
				() => new HttpResponse("server down", { status: 500 }),
			),
		)

		await expect(
			createInvoiceApprovalApi(apiBaseUrl).approveInvoice("invoice-1"),
		).rejects.toMatchObject({
			message: "Approval request failed",
			status: 500,
		})

		server.resetHandlers(
			http.post(new URL("invoices/:invoiceId/approve", apiBaseUrl).href, () =>
				HttpResponse.json({ message: "   " }, { status: 502 }),
			),
		)

		await expect(
			createInvoiceApprovalApi(apiBaseUrl).approveInvoice("invoice-1"),
		).rejects.toMatchObject({
			message: "Approval request failed",
			status: 502,
		})
	})

	it("invalidates after a stale successful DTO without regressing ECS or Query cache", async () => {
		const accepted = [
			invoice({
				status: "pending",
				version: 5,
				canApprove: true,
			}),
		]
		const fixture = createMutationFixture(accepted)

		const result = await submitInvoiceApproval({
			api: createInvoiceApprovalApi(apiBaseUrl),
			command: fixture.command,
			queryClient: fixture.queryClient,
			workspace: fixture.workspace,
			world: fixture.world,
		})

		expect(result).toEqual({ applied: false })
		expect(
			fixture.world.require(fixture.invoiceEntity, InvoiceSnapshot),
		).toEqual({
			number: "INV-001",
			vendor: "Northwind Traders",
			amountCents: 12_500,
			status: "pending",
			version: 5,
		})
		expect(fixture.world.require(fixture.invoiceEntity, CanApprove)).toBe(true)
		expect(cachedInvoice(fixture.queryClient, "invoice-1")).toMatchObject({
			status: "pending",
			version: 5,
			canApprove: true,
		})
		expect(
			fixture.queryClient.getQueryState(invoiceQueryKey)?.isInvalidated,
		).toBe(true)

		fixture.queryClient.clear()
	})

	it("aborts an older GET before POST so stale list data cannot overwrite the approval result", async () => {
		const fixture = createMutationFixture([invoice()])
		const queryOptions = createInvoiceQueryOptions(createInvoiceApi(apiBaseUrl))
		const getStarted = createDeferred()
		const releaseGet = createDeferred()
		let getSignal: AbortSignal | undefined

		server.resetHandlers(
			http.get(new URL("invoices", apiBaseUrl).href, async ({ request }) => {
				getSignal = request.signal
				getStarted.resolve()
				await Promise.race([
					releaseGet.promise,
					new Promise<void>(resolve => {
						request.signal.addEventListener("abort", () => resolve(), {
							once: true,
						})
					}),
				])
				if (request.signal.aborted) {
					return new HttpResponse(null, { status: 499 })
				}

				return HttpResponse.json<InvoiceListResponse>({
					items: [invoice({ vendor: "Stale GET", version: 1 })],
				})
			}),
			...createInvoiceHandlers({ baseUrl: apiBaseUrl, store }),
		)

		fixture.queryClient.setQueryData<InvoiceListResponse>(
			invoiceQueryKey,
			{ items: [invoice()] },
			{ updatedAt: 0 },
		)
		const staleGet = fixture.queryClient
			.fetchQuery({ ...queryOptions, staleTime: 0 })
			.catch((error: unknown) => error)

		await getStarted.promise
		expect(getSignal?.aborted).toBe(false)

		const mutation = submitInvoiceApproval({
			api: createInvoiceApprovalApi(apiBaseUrl),
			command: fixture.command,
			queryClient: fixture.queryClient,
			workspace: fixture.workspace,
			world: fixture.world,
		})

		await expect.poll(() => getSignal?.aborted ?? false).toBe(true)
		releaseGet.resolve()

		await expect(mutation).resolves.toEqual({ applied: true })
		await staleGet
		expect(cachedInvoice(fixture.queryClient, "invoice-1")).toMatchObject({
			status: "approved",
			version: 2,
			canApprove: false,
		})
		expect(
			fixture.world.require(fixture.invoiceEntity, InvoiceSnapshot),
		).toMatchObject({
			status: "approved",
			version: 2,
		})

		fixture.queryClient.clear()
	})
})
