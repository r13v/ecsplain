// @vitest-environment jsdom

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { createWorld } from "ecsplain"
import { WorldProvider } from "ecsplain/react"
import { afterEach, describe, expect, it } from "vitest"
import {
	applyInvoiceSnapshot,
	createInvoiceQueryOptions,
	createInvoiceWorkspace,
	type InvoiceDto,
	type InvoiceListResponse,
} from "../examples/invoice-approval/src/features/invoice-workspace"
import { InvoiceWorkspace } from "../examples/invoice-approval/src/features/invoice-workspace/InvoiceWorkspace"

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

afterEach(() => {
	cleanup()
})

describe("invoice workspace UI", () => {
	it("renders an initial load error when no ECS rows are available", async () => {
		const queryClient = createQueryClient()
		const world = createWorld()
		const queryOptions = createInvoiceQueryOptions({
			async listInvoices() {
				throw new Error("Failed to load invoices (503)")
			},
		})

		render(
			<QueryClientProvider client={queryClient}>
				<WorldProvider world={world}>
					<InvoiceWorkspace
						queryOptions={queryOptions}
						renderApprovalControls={() => null}
					/>
				</WorldProvider>
			</QueryClientProvider>,
		)

		const alert = await screen.findByRole("alert")
		expect(alert.textContent).toContain(
			"Refresh failed: Failed to load invoices (503)",
		)
		expect(screen.getByRole("status").textContent).toContain(
			"Unable to load invoices: Failed to load invoices (503)",
		)
		expect(screen.getByText("Unable to load invoices")).toBeTruthy()

		queryClient.clear()
	})

	it("keeps cached ECS rows visible while rendering a refresh error", async () => {
		const queryClient = createQueryClient()
		const world = createWorld()
		const workspace = createInvoiceWorkspace(world)
		const current = invoice()
		world.run(applyInvoiceSnapshot, { workspace, invoice: current })
		const queryOptions = createInvoiceQueryOptions({
			async listInvoices() {
				throw new Error("Failed to load invoices (503)")
			},
		})
		queryClient.setQueryData<InvoiceListResponse>(queryOptions.queryKey, {
			items: [current],
		})

		render(
			<QueryClientProvider client={queryClient}>
				<WorldProvider world={world}>
					<InvoiceWorkspace
						queryOptions={queryOptions}
						renderApprovalControls={() => null}
					/>
				</WorldProvider>
			</QueryClientProvider>,
		)

		fireEvent.click(screen.getByRole("button", { name: "Refresh invoices" }))

		const alert = await screen.findByRole("alert")
		expect(alert.textContent).toContain(
			"Refresh failed: Failed to load invoices (503)",
		)
		expect(screen.getByTestId("invoice-row-INV-001").textContent).toContain(
			"Northwind Traders",
		)

		queryClient.clear()
	})
})
