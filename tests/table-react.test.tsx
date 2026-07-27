// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react"
import { WorldProvider } from "ecsplain/react"
import { describe, expect, it, vi } from "vitest"
import { App } from "../examples/table/src/App"
import { createTableExample } from "../examples/table/src/bootstrap"
import { SelectedCell, TableCell } from "../examples/table/src/model"

const renderCounts = vi.hoisted(() => ({ tableGrid: 0 }))

vi.mock("../examples/table/src/TableGrid", () => ({
	TableGrid: () => {
		renderCounts.tableGrid += 1
		return <div data-testid="table-grid-stub" />
	},
}))

describe("table React subscriptions", () => {
	it("keeps selection updates from rerendering the table container", () => {
		renderCounts.tableGrid = 0
		const example = createTableExample(1)
		const cell = example.world.query(TableCell)[0]?.[0]
		if (cell === undefined) {
			throw new Error("Expected a cell entity")
		}

		render(
			<WorldProvider world={example.world}>
				<App table={example.table} />
			</WorldProvider>,
		)

		expect(renderCounts.tableGrid).toBe(1)

		act(() => example.world.set(cell, SelectedCell, true))

		expect(screen.getByTestId("selected-count").textContent).toContain(
			"1 cell selected",
		)
		expect(renderCounts.tableGrid).toBe(1)
	})
})
