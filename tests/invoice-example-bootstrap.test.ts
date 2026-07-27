import { QueryClient } from "@tanstack/react-query"
import { createWorld, type System } from "ecsplain"
import { setupServer } from "msw/node"
import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	describe,
	expect,
	it,
	vi,
} from "vitest"
import {
	type InvoiceExampleConfig,
	resolveInvoiceExampleConfig,
} from "../examples/invoice-approval/src/app/config"
import { createInvoiceExample } from "../examples/invoice-approval/src/app/create-example"
import {
	ApprovalEnabled,
	ApprovalVariant,
} from "../examples/invoice-approval/src/features/invoice-approval"
import {
	type InvoiceDto,
	InvoiceSnapshot,
	invoiceQueryKey,
	RenderableInvoices,
} from "../examples/invoice-approval/src/features/invoice-workspace"
import { createTracingMiddleware } from "../examples/invoice-approval/src/instrumentation/tracing-middleware"
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

function config(
	overrides: Partial<InvoiceExampleConfig> = {},
): InvoiceExampleConfig {
	return {
		approvalEnabled: true,
		approvalVariant: "direct",
		...overrides,
	}
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
	vi.restoreAllMocks()
})

afterAll(() => {
	server.close()
})

describe("invoice example bootstrap", () => {
	it("resolves session-fixed approval configuration from the URL before World creation", () => {
		expect(
			resolveInvoiceExampleConfig(new URL("http://invoice.test/workspace")),
		).toEqual(config())
		expect(
			resolveInvoiceExampleConfig(
				new URL("http://invoice.test/workspace?variant=review"),
			),
		).toEqual(config({ approvalVariant: "review" }))
		expect(
			resolveInvoiceExampleConfig(
				new URL("http://invoice.test/workspace?approval=off"),
			),
		).toEqual(config({ approvalEnabled: false }))
	})

	it("composes one runtime around shared API base URL, query options, bridge, and feature state", async () => {
		const example = createInvoiceExample({
			apiBaseUrl,
			config: config({
				approvalEnabled: false,
				approvalVariant: "review",
			}),
			middleware: [],
		})

		expect(example.queryClient).toBeInstanceOf(QueryClient)
		expect(example.queryOptions.queryKey).toBe(invoiceQueryKey)
		expect(
			example.world.require(example.workspaceEntity, ApprovalEnabled),
		).toBe(false)
		expect(
			example.world.require(example.workspaceEntity, ApprovalVariant),
		).toBe("review")

		await expect
			.poll(() => example.world.query(RenderableInvoices).length)
			.toBe(3)
		expect(store.listRequests).toBe(1)

		const approved = await example.approvalApi.approveInvoice("invoice-1")
		expect(approved).toMatchObject({
			id: "invoice-1",
			status: "approved",
			version: 2,
		})

		const firstInvoice = example.workspace.invoiceById.get("invoice-1")
		if (firstInvoice === undefined) {
			throw new Error("Expected invoice-1 in the composed workspace")
		}
		expect(example.world.require(firstInvoice, InvoiceSnapshot)).toMatchObject({
			status: "pending",
			version: 1,
		})

		example.dispose()
		expect(example.queryClient.getQueryData(invoiceQueryKey)).toBeUndefined()

		example.queryClient.setQueryData(example.queryOptions.queryKey, {
			items: [invoice({ vendor: "Ignored after disposal", version: 5 })],
		})
		expect(example.world.require(firstInvoice, InvoiceSnapshot)).toMatchObject({
			vendor: "Northwind Traders",
			version: 1,
		})

		example.dispose()
	})
})

describe("invoice tracing middleware", () => {
	it("logs success diagnostics without exposing middleware input and returns the exact result", () => {
		const consoleInfo = vi
			.spyOn(console, "info")
			.mockImplementation(() => undefined)
		const result = { ok: true }
		const nowValues = [10, 20]
		const world = createWorld({
			middleware: [
				createTracingMiddleware({
					now: () => nowValues.shift() ?? 20,
				}),
			],
		})
		const successfulSystem: System<
			{ readonly secret: string },
			typeof result
		> = () => result

		expect(
			world.run(successfulSystem, { secret: "do not log this invoice data" }),
		).toBe(result)
		expect(consoleInfo).toHaveBeenCalledWith("ecsplain:system", {
			depth: 0,
			durationMs: 10,
			outcome: "success",
			system: "successfulSystem",
		})
		expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain(
			"do not log this invoice data",
		)
	})

	it("logs nested depth and rethrows the exact original error", () => {
		const consoleInfo = vi
			.spyOn(console, "info")
			.mockImplementation(() => undefined)
		const failure = new Error("Approval failed")
		const nowValues = [10, 20, 25, 30]
		const world = createWorld({
			middleware: [
				createTracingMiddleware({
					now: () => nowValues.shift() ?? 30,
				}),
			],
		})
		const childSystem: System<void> = () => {
			throw failure
		}
		const parentSystem: System<{ readonly secret: string }> = currentWorld => {
			currentWorld.run(childSystem)
		}

		let thrown: unknown
		try {
			world.run(parentSystem, { secret: "sensitive approval input" })
		} catch (error) {
			thrown = error
		}

		expect(thrown).toBe(failure)
		expect(consoleInfo).toHaveBeenCalledWith("ecsplain:system", {
			depth: 1,
			durationMs: 5,
			outcome: "error",
			system: "childSystem",
		})
		expect(consoleInfo).toHaveBeenCalledWith("ecsplain:system", {
			depth: 0,
			durationMs: 20,
			outcome: "error",
			system: "parentSystem",
		})
		expect(JSON.stringify(consoleInfo.mock.calls)).not.toContain(
			"sensitive approval input",
		)
	})
})
