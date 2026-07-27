import type { Entity, World } from "ecsplain"
import { createWorld } from "ecsplain"
import { describe, expect, it } from "vitest"
import {
	ApprovalEnabled,
	ApprovalError,
	ApprovalReview,
	ApprovalVariant,
	applyInvoiceApprovalFailure,
	applyInvoiceApprovalSuccess,
	cancelInvoiceApprovalReview,
	confirmInvoiceApprovalReview,
	PendingApproval,
	requestInvoiceApproval,
} from "../examples/invoice-approval/src/features/invoice-approval"
import {
	applyInvoiceSnapshot,
	CanApprove,
	createInvoiceWorkspace,
	type InvoiceDto,
	InvoiceSnapshot,
	type InvoiceWorkspace,
	reconcileInvoices,
} from "../examples/invoice-approval/src/features/invoice-workspace"

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

interface ApprovalFixture {
	readonly world: World
	readonly workspace: InvoiceWorkspace
	readonly workspaceEntity: Entity
	readonly invoiceEntity: Entity
}

function createApprovalFixture({
	approvalEnabled = true,
	variant = "direct",
	incoming = invoice(),
}: {
	readonly approvalEnabled?: boolean
	readonly variant?: "direct" | "review"
	readonly incoming?: InvoiceDto
} = {}): ApprovalFixture {
	const world = createWorld()
	const workspace = createInvoiceWorkspace(world)
	const workspaceEntity = world.create()
	world.set(workspaceEntity, ApprovalEnabled, approvalEnabled)
	world.set(workspaceEntity, ApprovalVariant, variant)
	const { entity } = world.run(applyInvoiceSnapshot, {
		workspace,
		invoice: incoming,
	})

	return { world, workspace, workspaceEntity, invoiceEntity: entity }
}

describe("invoice approval systems", () => {
	it("starts direct approval by adding pending state and returning a command", () => {
		const { world, workspaceEntity, invoiceEntity } = createApprovalFixture()

		const command = world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice: invoiceEntity,
		})

		expect(command).toEqual({
			invoice: invoiceEntity,
			invoiceId: "invoice-1",
		})
		expect(world.require(invoiceEntity, PendingApproval)).toBe(true)
		expect(world.get(invoiceEntity, ApprovalReview)).toBeUndefined()
		expect(world.get(invoiceEntity, ApprovalError)).toBeUndefined()
	})

	it("keeps the previous approval error if workspace approval config is invalid", () => {
		const { world, workspaceEntity, invoiceEntity } = createApprovalFixture()
		world.set(invoiceEntity, ApprovalError, { message: "Still visible" })
		world.remove(workspaceEntity, ApprovalVariant)

		expect(() =>
			world.run(requestInvoiceApproval, {
				workspace: workspaceEntity,
				invoice: invoiceEntity,
			}),
		).toThrow("ApprovalVariant")
		expect(world.require(invoiceEntity, ApprovalError)).toEqual({
			message: "Still visible",
		})
		expect(world.get(invoiceEntity, PendingApproval)).toBeUndefined()
		expect(world.get(invoiceEntity, ApprovalReview)).toBeUndefined()
	})

	it("uses review variant state until explicit confirmation or cancel", () => {
		const { world, workspaceEntity, invoiceEntity } = createApprovalFixture({
			variant: "review",
		})

		const firstRequest = world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice: invoiceEntity,
		})

		expect(firstRequest).toBeUndefined()
		expect(world.require(invoiceEntity, ApprovalReview)).toBe(true)
		expect(world.get(invoiceEntity, PendingApproval)).toBeUndefined()

		expect(
			world.run(cancelInvoiceApprovalReview, { invoice: invoiceEntity }),
		).toBe(true)
		expect(world.get(invoiceEntity, ApprovalReview)).toBeUndefined()

		world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice: invoiceEntity,
		})
		const command = world.run(confirmInvoiceApprovalReview, {
			invoice: invoiceEntity,
		})

		expect(command).toEqual({
			invoice: invoiceEntity,
			invoiceId: "invoice-1",
		})
		expect(world.require(invoiceEntity, PendingApproval)).toBe(true)
		expect(world.get(invoiceEntity, ApprovalReview)).toBeUndefined()
	})

	it("clears stale review state when capability disappears before confirmation", () => {
		const { world, workspace, workspaceEntity, invoiceEntity } =
			createApprovalFixture({
				variant: "review",
			})
		world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice: invoiceEntity,
		})

		world.run(reconcileInvoices, {
			workspace,
			response: {
				items: [
					invoice({
						status: "approved",
						version: 2,
						canApprove: false,
					}),
				],
			},
		})
		const command = world.run(confirmInvoiceApprovalReview, {
			invoice: invoiceEntity,
		})

		expect(command).toBeUndefined()
		expect(world.get(invoiceEntity, ApprovalReview)).toBeUndefined()
		expect(world.get(invoiceEntity, PendingApproval)).toBeUndefined()
		expect(world.require(invoiceEntity, InvoiceSnapshot)).toMatchObject({
			status: "approved",
			version: 2,
		})
	})

	it("rejects disabled rollout, missing capability, approved invoices, and duplicate pending requests", () => {
		const disabled = createApprovalFixture({ approvalEnabled: false })
		expect(
			disabled.world.run(requestInvoiceApproval, {
				workspace: disabled.workspaceEntity,
				invoice: disabled.invoiceEntity,
			}),
		).toBeUndefined()
		expect(disabled.world.get(disabled.invoiceEntity, PendingApproval)).toBe(
			undefined,
		)

		const missingCapability = createApprovalFixture({
			incoming: invoice({ canApprove: false }),
		})
		expect(
			missingCapability.world.run(requestInvoiceApproval, {
				workspace: missingCapability.workspaceEntity,
				invoice: missingCapability.invoiceEntity,
			}),
		).toBeUndefined()

		const alreadyApproved = createApprovalFixture({
			incoming: invoice({ status: "approved", canApprove: true }),
		})
		expect(
			alreadyApproved.world.run(requestInvoiceApproval, {
				workspace: alreadyApproved.workspaceEntity,
				invoice: alreadyApproved.invoiceEntity,
			}),
		).toBeUndefined()

		const duplicate = createApprovalFixture()
		duplicate.world.set(duplicate.invoiceEntity, PendingApproval, true)
		expect(
			duplicate.world.run(requestInvoiceApproval, {
				workspace: duplicate.workspaceEntity,
				invoice: duplicate.invoiceEntity,
			}),
		).toBeUndefined()
		expect(
			duplicate.world.require(duplicate.invoiceEntity, PendingApproval),
		).toBe(true)
	})

	it("applies approval success through the workspace snapshot system and clears transient state", () => {
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
		const workspaceEntity = world.create()
		world.set(workspaceEntity, ApprovalEnabled, true)
		world.set(workspaceEntity, ApprovalVariant, "direct")
		const { entity } = world.run(applyInvoiceSnapshot, {
			workspace,
			invoice: invoice(),
		})
		const command = world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice: entity,
		})
		if (command === undefined) {
			throw new Error("Expected direct approval command")
		}
		world.set(entity, ApprovalReview, true)
		world.set(entity, ApprovalError, { message: "Previous failure" })
		systems.length = 0

		const result = world.run(applyInvoiceApprovalSuccess, {
			workspace,
			command,
			invoice: invoice({
				status: "approved",
				version: 2,
				canApprove: false,
			}),
		})

		expect(result).toEqual({ applied: true })
		expect(systems).toEqual([applyInvoiceApprovalSuccess, applyInvoiceSnapshot])
		expect(world.require(entity, InvoiceSnapshot)).toMatchObject({
			status: "approved",
			version: 2,
		})
		expect(world.get(entity, CanApprove)).toBeUndefined()
		expect(world.get(entity, PendingApproval)).toBeUndefined()
		expect(world.get(entity, ApprovalReview)).toBeUndefined()
		expect(world.get(entity, ApprovalError)).toBeUndefined()
	})

	it("ignores stale mutation success so approval responses cannot regress a newer accepted snapshot", () => {
		const { world, workspace, workspaceEntity, invoiceEntity } =
			createApprovalFixture({
				incoming: invoice({ version: 5, canApprove: true }),
			})
		const command = world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice: invoiceEntity,
		})
		if (command === undefined) {
			throw new Error("Expected direct approval command")
		}

		const result = world.run(applyInvoiceApprovalSuccess, {
			workspace,
			command,
			invoice: invoice({
				status: "approved",
				version: 4,
				canApprove: false,
			}),
		})

		expect(result).toEqual({ applied: false })
		expect(world.require(invoiceEntity, InvoiceSnapshot)).toMatchObject({
			status: "pending",
			version: 5,
		})
		expect(world.require(invoiceEntity, CanApprove)).toBe(true)
		expect(world.get(invoiceEntity, PendingApproval)).toBeUndefined()
	})

	it("keeps review, pending, and error state when background list reconciliation refreshes snapshots", () => {
		const { world, workspace, invoiceEntity } = createApprovalFixture()
		world.set(invoiceEntity, ApprovalReview, true)
		world.set(invoiceEntity, PendingApproval, true)
		world.set(invoiceEntity, ApprovalError, { message: "Still visible" })

		world.run(reconcileInvoices, {
			workspace,
			response: {
				items: [invoice({ vendor: "Updated Vendor", version: 2 })],
			},
		})

		expect(world.require(invoiceEntity, ApprovalReview)).toBe(true)
		expect(world.require(invoiceEntity, PendingApproval)).toBe(true)
		expect(world.require(invoiceEntity, ApprovalError)).toEqual({
			message: "Still visible",
		})
		expect(world.require(invoiceEntity, InvoiceSnapshot)).toMatchObject({
			vendor: "Updated Vendor",
			version: 2,
		})
	})

	it("stores approval failure without changing the last accepted server snapshot", () => {
		const { world, workspaceEntity, invoiceEntity } = createApprovalFixture({
			incoming: invoice({ version: 3 }),
		})
		const command = world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice: invoiceEntity,
		})
		if (command === undefined) {
			throw new Error("Expected direct approval command")
		}

		world.run(applyInvoiceApprovalFailure, {
			command,
			message: " Already approved on the server ",
		})

		expect(world.require(invoiceEntity, InvoiceSnapshot)).toMatchObject({
			status: "pending",
			version: 3,
		})
		expect(world.get(invoiceEntity, PendingApproval)).toBeUndefined()
		expect(world.require(invoiceEntity, ApprovalError)).toEqual({
			message: "Already approved on the server",
		})
	})

	it("rejects success payloads for a different invoice id", () => {
		const { world, workspace, workspaceEntity, invoiceEntity } =
			createApprovalFixture()
		const command = world.run(requestInvoiceApproval, {
			workspace: workspaceEntity,
			invoice: invoiceEntity,
		})
		if (command === undefined) {
			throw new Error("Expected direct approval command")
		}

		expect(() =>
			world.run(applyInvoiceApprovalSuccess, {
				workspace,
				command,
				invoice: invoice({
					id: "invoice-2",
					number: "INV-002",
					version: 2,
				}),
			}),
		).toThrow('Approval response id "invoice-2" did not match "invoice-1"')
		expect(world.require(invoiceEntity, PendingApproval)).toBe(true)
	})
})
