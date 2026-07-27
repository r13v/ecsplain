import { expect, test } from "@playwright/test"

test.beforeEach(async ({ page }) => {
	await page.goto("http://127.0.0.1:4174")
	await expect(
		page.getByRole("heading", {
			name: "A form whose structure lives in ECS",
		}),
	).toBeVisible()
})

test("changes structure, preserves branch values, and submits active fields", async ({
	page,
}) => {
	await page.getByLabel("Full name").fill("Ada Lovelace")
	await page.getByLabel("City").fill("London")
	await page.getByLabel("Delivery method").selectOption("pickup")

	await expect(page.getByLabel("City")).toHaveCount(0)
	await expect(page.getByLabel("Street address")).toHaveCount(0)
	await page.getByLabel("Pickup point").selectOption("central")

	await page.getByRole("button", { name: "Submit request" }).click()
	const result = page.getByTestId("submission-result")
	await expect(result).toContainText('"pickupPoint": "central"')
	await expect(result).not.toContainText('"city"')

	await page.getByLabel("Delivery method").selectOption("courier")
	await expect(page.getByLabel("City")).toHaveValue("London")
	await expect(page.getByLabel("Pickup point")).toHaveCount(0)
})

test("stores validation feedback in ECS", async ({ page }) => {
	await page.getByRole("button", { name: "Submit request" }).click()

	await expect(page.getByRole("alert")).toHaveCount(3)
	await page.getByLabel("Full name").fill("Grace Hopper")
	await expect(page.getByRole("alert")).toHaveCount(0)
})
