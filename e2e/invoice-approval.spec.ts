import { expect, type Page, test } from "@playwright/test"

const invoiceUrl = "http://127.0.0.1:4175"

function invoiceRow(page: Page, invoiceNumber: string) {
	return page.getByTestId(`invoice-row-${invoiceNumber}`)
}

async function expectInvoiceRow(page: Page, invoiceNumber: string) {
	const row = invoiceRow(page, invoiceNumber)
	await expect(row).toBeVisible()
	return row
}

test("loads invoices and keeps cached rows visible during manual refresh", async ({
	page,
}) => {
	await page.goto(invoiceUrl)

	await expect(
		page.getByRole("heading", { name: "Invoice approvals" }),
	).toBeVisible()
	await expect(page.getByRole("status")).toContainText("Loading invoices")

	await expectInvoiceRow(page, "INV-001")
	await expectInvoiceRow(page, "INV-002")
	await expectInvoiceRow(page, "INV-003")

	await page.getByRole("button", { name: "Refresh invoices" }).click()

	await expect(invoiceRow(page, "INV-001")).toContainText("Northwind Traders")
	await expect(page.getByRole("status")).toContainText("Refreshing invoices")
	await expect(invoiceRow(page, "INV-001")).toBeVisible()
})

test("approves directly, renders pending ECS state, and emits a depth-zero trace", async ({
	page,
}) => {
	const traces: unknown[] = []
	page.on("console", message => {
		if (message.type() !== "info") {
			return
		}

		void Promise.all(message.args().map(argument => argument.jsonValue())).then(
			([label, event]) => {
				if (label === "ecsplain:system") {
					traces.push(event)
				}
			},
		)
	})

	await page.goto(invoiceUrl)
	const row = await expectInvoiceRow(page, "INV-001")

	await row.getByRole("button", { name: "Approve INV-001" }).click()

	await expect(row).toContainText("Approval pending")
	await expect(
		row.getByRole("button", { name: "Approve INV-001" }),
	).toBeDisabled()
	await expect(row).toContainText("Approved")
	await expect(
		row.getByRole("button", { name: "Approve INV-001" }),
	).toHaveCount(0)
	await expect
		.poll(() =>
			traces.some(
				event =>
					isTraceEvent(event) &&
					event.system === "requestInvoiceApproval" &&
					event.depth === 0 &&
					event.outcome === "success",
			),
		)
		.toBe(true)
})

test("maps approval rejection to a visible alert without changing the snapshot", async ({
	page,
}) => {
	await page.goto(invoiceUrl)
	const row = await expectInvoiceRow(page, "INV-002")

	await row.getByRole("button", { name: "Approve INV-002" }).click()

	await expect(row).toContainText("Approval pending")
	await expect(row.getByRole("alert")).toContainText(
		"Invoice INV-002 requires manual review before approval",
	)
	await expect(row).toContainText("Pending")
	await expect(
		row.getByRole("button", { name: "Approve INV-002" }),
	).toBeEnabled()
})

test("requires confirmation in the review variant and supports cancel", async ({
	page,
}) => {
	await page.goto(`${invoiceUrl}?variant=review`)
	const row = await expectInvoiceRow(page, "INV-001")

	await row.getByRole("button", { name: "Approve INV-001" }).click()
	await expect(row).toContainText("Review required")

	await row.getByRole("button", { name: "Cancel approval for INV-001" }).click()
	await expect(row).not.toContainText("Review required")
	await expect(
		row.getByRole("button", { name: "Approve INV-001" }),
	).toBeEnabled()

	await row.getByRole("button", { name: "Approve INV-001" }).click()
	await row
		.getByRole("button", { name: "Confirm approval for INV-001" })
		.click()

	await expect(row).toContainText("Approval pending")
	await expect(row).toContainText("Approved")
})

test("loads invoices without approval controls when rollout is disabled", async ({
	page,
}) => {
	await page.goto(`${invoiceUrl}?approval=off`)

	await expectInvoiceRow(page, "INV-001")
	await expectInvoiceRow(page, "INV-002")
	await expect(
		page.getByText("Approval rollout is disabled for this session."),
	).toBeVisible()
	await expect(page.getByRole("button", { name: /Approve INV-/ })).toHaveCount(
		0,
	)
})

interface TraceEvent {
	readonly system: string
	readonly depth: number
	readonly outcome: string
}

function isTraceEvent(event: unknown): event is TraceEvent {
	return (
		typeof event === "object" &&
		event !== null &&
		"system" in event &&
		"depth" in event &&
		"outcome" in event
	)
}
