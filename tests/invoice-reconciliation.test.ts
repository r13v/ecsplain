import { createWorld, defineComponent } from "ecsplain"
import { describe, expect, it, vi } from "vitest"
import {
	applyInvoiceSnapshot,
	CanApprove,
	createInvoiceWorkspace,
	type InvoiceDto,
	InvoiceId,
	InvoiceSnapshot,
	RenderableInvoices,
	reconcileInvoices,
} from "../examples/invoice-approval/src/features/invoice-workspace"

const LocalNote = defineComponent<{ readonly text: string }>("LocalNote")
const LocalFlag = defineComponent<true>("LocalFlag")

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

describe("invoice reconciliation", () => {
	it("spawns a renderable ECS projection for the first server snapshot", () => {
		const world = createWorld()
		const workspace = createInvoiceWorkspace(world)
		const incoming = invoice()

		const result = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: incoming,
		})

		expect(result.applied).toBe(true)
		expect(workspace.invoiceById.get("invoice-1")).toBe(result.entity)
		expect(world.require(result.entity, InvoiceId)).toBe("invoice-1")
		expect(world.require(result.entity, InvoiceSnapshot)).toEqual({
			number: "INV-001",
			vendor: "Northwind Traders",
			amountCents: 12_500,
			status: "pending",
			version: 1,
		})
		expect(world.require(result.entity, CanApprove)).toBe(true)
		expect(world.query(RenderableInvoices)).toEqual([
			[
				result.entity,
				"invoice-1",
				{
					number: "INV-001",
					vendor: "Northwind Traders",
					amountCents: 12_500,
					status: "pending",
					version: 1,
				},
				true,
			],
		])
	})

	it("updates an existing entity by InvoiceId and prevents duplicate entities", () => {
		const world = createWorld()
		const workspace = createInvoiceWorkspace(world)
		const initial = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({ canApprove: false }),
		})

		const applied = world.run(reconcileInvoices, {
			workspace,
			response: {
				items: [
					invoice({
						vendor: "Globex",
						version: 2,
						canApprove: true,
					}),
					invoice({
						vendor: "Initech",
						status: "approved",
						version: 3,
						canApprove: false,
					}),
				],
			},
		})

		expect(applied).toBe(2)
		expect(world.query(InvoiceId)).toHaveLength(1)
		expect(workspace.invoiceById.get("invoice-1")).toBe(initial.entity)
		expect(world.require(initial.entity, InvoiceSnapshot)).toEqual({
			number: "INV-001",
			vendor: "Initech",
			amountCents: 12_500,
			status: "approved",
			version: 3,
		})
		expect(world.get(initial.entity, CanApprove)).toBeUndefined()
	})

	it("keeps invoices missing from one list response and preserves unrelated components", () => {
		const world = createWorld()
		const workspace = createInvoiceWorkspace(world)
		const first = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({ id: "invoice-1" }),
		})
		const second = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({
				id: "invoice-2",
				number: "INV-002",
				vendor: "Tailspin Toys",
				canApprove: false,
			}),
		})
		world.set(first.entity, LocalNote, { text: "reviewing vendor history" })
		world.set(second.entity, LocalFlag, true)

		world.run(reconcileInvoices, {
			workspace,
			response: {
				items: [
					invoice({
						id: "invoice-1",
						vendor: "Updated Vendor",
						version: 2,
						canApprove: false,
					}),
				],
			},
		})

		expect(world.exists(second.entity)).toBe(true)
		expect(world.require(second.entity, InvoiceId)).toBe("invoice-2")
		expect(world.require(second.entity, InvoiceSnapshot).version).toBe(1)
		expect(world.require(second.entity, LocalFlag)).toBe(true)
		expect(world.require(first.entity, LocalNote)).toEqual({
			text: "reviewing vendor history",
		})
		expect(world.query(RenderableInvoices)).toHaveLength(2)
	})

	it("ignores lower and equal versions so stale responses cannot regress capability", () => {
		const world = createWorld()
		const workspace = createInvoiceWorkspace(world)
		const initial = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({ version: 5, canApprove: true }),
		})

		const lower = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({
				vendor: "Stale Lower",
				status: "approved",
				version: 4,
				canApprove: false,
			}),
		})
		const equal = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({
				vendor: "Stale Equal",
				status: "approved",
				version: 5,
				canApprove: false,
			}),
		})
		const higher = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({
				vendor: "Accepted Higher",
				status: "approved",
				version: 6,
				canApprove: false,
			}),
		})

		expect(lower).toEqual({ entity: initial.entity, applied: false })
		expect(equal).toEqual({ entity: initial.entity, applied: false })
		expect(higher).toEqual({ entity: initial.entity, applied: true })
		expect(world.require(initial.entity, InvoiceSnapshot)).toEqual({
			number: "INV-001",
			vendor: "Accepted Higher",
			amountCents: 12_500,
			status: "approved",
			version: 6,
		})
		expect(world.get(initial.entity, CanApprove)).toBeUndefined()
	})

	it("publishes accepted snapshot and capability changes in one batch", () => {
		const world = createWorld()
		const workspace = createInvoiceWorkspace(world)
		const initial = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({ canApprove: false }),
		})
		const listener = vi.fn()
		world.subscribe(listener, { components: [InvoiceSnapshot, CanApprove] })

		world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice({ version: 2, canApprove: true }),
		})

		expect(world.require(initial.entity, InvoiceSnapshot).version).toBe(2)
		expect(world.require(initial.entity, CanApprove)).toBe(true)
		expect(listener).toHaveBeenCalledTimes(1)
	})

	it("reconciles each list item through the public nested snapshot system", () => {
		const systems: unknown[] = []
		const world = createWorld({
			middleware: [
				(execution, next) => {
					systems.push(execution.system)
					return next()
				},
			],
		})
		const workspace = createInvoiceWorkspace(world)

		world.run(reconcileInvoices, {
			workspace,
			response: {
				items: [
					invoice({ id: "invoice-1" }),
					invoice({ id: "invoice-2", number: "INV-002" }),
				],
			},
		})

		expect(systems).toEqual([
			reconcileInvoices,
			applyInvoiceSnapshot,
			applyInvoiceSnapshot,
		])
	})
})
