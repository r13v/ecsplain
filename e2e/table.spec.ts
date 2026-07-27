import { expect, type Page, test } from "@playwright/test"

const modifier = process.platform === "darwin" ? "Meta" : "Control"

async function dragBetween(page: Page, fromTestId: string, toTestId: string) {
	const from = page.getByTestId(fromTestId)
	const to = page.getByTestId(toTestId)
	const fromBox = await from.boundingBox()
	const toBox = await to.boundingBox()

	if (fromBox === null || toBox === null) {
		throw new Error("Expected visible table cells")
	}

	await page.mouse.move(
		fromBox.x + fromBox.width / 2,
		fromBox.y + fromBox.height / 2,
	)
	await page.mouse.down()
	await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2, {
		steps: 4,
	})
	await page.mouse.up()
}

test.beforeEach(async ({ page }) => {
	await page.goto("http://127.0.0.1:4173")
	await expect(
		page.getByRole("heading", { name: "Entity-driven data grid" }),
	).toBeVisible()
})

test("supports rectangular and additive selection", async ({ page }) => {
	await dragBetween(page, "cell-0-0", "cell-1-1")
	await expect(page.getByTestId("selected-count")).toContainText(
		"4 cells selected",
	)

	await page.keyboard.down(modifier)
	await page.getByTestId("cell-2-2").click()
	await page.keyboard.up(modifier)

	await expect(page.getByTestId("selected-count")).toContainText(
		"5 cells selected",
	)

	await page.getByRole("button", { name: "Sort by Name" }).click()
	await expect(page.getByTestId("selected-count")).toContainText(
		"0 cells selected",
	)
})

test("selects visible rows and columns, including additive unions", async ({
	page,
}) => {
	await page
		.getByRole("button", { name: /^Select row / })
		.first()
		.click()
	await expect(page.getByTestId("selected-count")).toContainText(
		"4 cells selected",
	)

	await page.keyboard.down(modifier)
	await page.getByRole("button", { name: "Select Email column" }).click()
	await page.keyboard.up(modifier)

	await expect(page.getByTestId("selected-count")).toContainText(
		"203 cells selected",
	)

	await page.getByRole("button", { name: "Select Role column" }).click()
	await expect(page.getByTestId("selected-count")).toContainText(
		"200 cells selected",
	)
})

test("edits a cell in place and filters through ECS", async ({ page }) => {
	const emailCell = page.getByTestId("cell-0-1")
	await emailCell.getByRole("button").dblclick()

	const editor = page.getByTestId("cell-editor")
	await expect(editor).toBeFocused()
	await editor.pressSequentially("edited@example.com")
	await editor.press("Enter")

	await expect(emailCell).toContainText("edited@example.com")

	await page.getByTestId("cell-0-0").click()
	await expect(page.getByTestId("selected-count")).toContainText(
		"1 cell selected",
	)
	await page.getByRole("searchbox", { name: "Search users" }).fill("grace")

	await expect(page.getByTestId("selected-count")).toContainText(
		"0 cells selected",
	)
	await expect(page.getByTestId("table-grid").locator("tbody tr")).toHaveCount(
		20,
	)
})

test("keeps an invalid draft and blocks sorting", async ({ page }) => {
	const emailCell = page.getByTestId("cell-0-1")
	await emailCell.getByRole("button").dblclick()
	const editor = page.getByTestId("cell-editor")
	await editor.fill("invalid")
	await editor.press("Enter")

	await expect(page.getByRole("alert")).toContainText("@")
	await page.getByRole("button", { name: "Sort by Name" }).click()

	await expect(page.getByTestId("cell-editor")).toHaveValue("invalid")
	await expect(page.getByRole("alert")).toContainText("@")
})
