import { describe, expect, it, vi } from "vitest"
import { createTableExample } from "../examples/table/src/bootstrap"
import {
	beginCellEdit,
	cancelCellEdit,
	commitCellEdit,
	updateCellDraft,
} from "../examples/table/src/editing-systems"
import {
	CellDraft,
	CellError,
	FocusedCell,
	SelectedCell,
	TableCell,
	TableFilters,
	TableView,
	UserRow,
} from "../examples/table/src/model"
import {
	beginCellSelection,
	extendCellSelection,
	finishCellSelection,
	selectColumn,
	selectRow,
} from "../examples/table/src/selection-systems"
import {
	setTableFilters,
	toggleTableSort,
} from "../examples/table/src/table-systems"

function requireView(example: ReturnType<typeof createTableExample>) {
	const view = example.world.get(example.table, TableView)
	if (view === undefined) {
		throw new Error("Expected a table view")
	}
	return view
}

describe("table view", () => {
	it("derives a complete row-column-cell matrix from authoritative data", () => {
		const example = createTableExample(8)
		const view = requireView(example)

		expect(view.columns).toHaveLength(4)
		expect(view.rows).toHaveLength(8)
		expect(view.rows.every(row => row.cells.length === 4)).toBe(true)
		expect(example.world.query(UserRow)).toHaveLength(8)
		expect(example.world.query(TableCell)).toHaveLength(32)

		const firstCell = view.rows[0]?.cells[0]
		const address =
			firstCell === undefined
				? undefined
				: example.world.get(firstCell, TableCell)
		expect(address?.row).toBe(view.rows[0]?.row)
		expect(address?.column).toBe(view.columns[0])
	})

	it("filters and sorts rows, clearing selection each time", () => {
		const example = createTableExample(20)
		const initialView = requireView(example)
		const selected = initialView.rows[0]?.cells[0]
		const nameColumn = initialView.columns[0]
		if (selected === undefined || nameColumn === undefined) {
			throw new Error("Expected table cells and columns")
		}

		example.world.set(selected, SelectedCell, true)
		example.world.run(setTableFilters, {
			table: example.table,
			patch: { search: "grace" },
		})

		const filtered = requireView(example)
		expect(filtered.rows.length).toBeGreaterThan(0)
		expect(
			filtered.rows.every(({ row }) =>
				example.world
					.get(row, UserRow)
					?.name.toLocaleLowerCase("en")
					.includes("grace"),
			),
		).toBe(true)
		expect(example.world.query(SelectedCell)).toEqual([])

		const filteredCell = filtered.rows[0]?.cells[0]
		if (filteredCell === undefined) {
			throw new Error("Expected a filtered cell")
		}
		example.world.set(filteredCell, SelectedCell, true)
		example.world.run(toggleTableSort, {
			table: example.table,
			column: nameColumn,
		})

		const sortedNames = requireView(example).rows.map(
			({ row }) => example.world.get(row, UserRow)?.name,
		)
		expect(sortedNames).toEqual([...sortedNames].sort().reverse())
		expect(example.world.query(SelectedCell)).toEqual([])
	})
})

describe("cell selection", () => {
	it("grows and shrinks a rectangular drag relative to its anchor", () => {
		const example = createTableExample(5)
		const view = requireView(example)
		const anchor = view.rows[0]?.cells[0]
		const corner = view.rows[1]?.cells[1]
		if (anchor === undefined || corner === undefined) {
			throw new Error("Expected cells")
		}

		example.world.run(beginCellSelection, {
			table: example.table,
			cell: anchor,
			additive: false,
		})
		example.world.run(extendCellSelection, {
			table: example.table,
			cell: corner,
		})

		expect(example.world.query(SelectedCell)).toHaveLength(4)

		example.world.run(extendCellSelection, {
			table: example.table,
			cell: anchor,
		})
		example.world.run(finishCellSelection, { table: example.table })

		expect(example.world.query(SelectedCell).map(([cell]) => cell)).toEqual([
			anchor,
		])
		expect(example.world.has(anchor, FocusedCell)).toBe(true)
	})

	it("unions additive ranges and supports row and visible-column selection", () => {
		const example = createTableExample(4)
		const view = requireView(example)
		const first = view.rows[0]?.cells[0]
		const last = view.rows[3]?.cells[3]
		if (first === undefined || last === undefined) {
			throw new Error("Expected cells")
		}

		example.world.run(beginCellSelection, {
			table: example.table,
			cell: first,
			additive: false,
		})
		example.world.run(finishCellSelection, { table: example.table })
		example.world.run(beginCellSelection, {
			table: example.table,
			cell: last,
			additive: true,
		})
		example.world.run(finishCellSelection, { table: example.table })

		expect(example.world.query(SelectedCell)).toHaveLength(2)

		const secondRow = view.rows[1]?.row
		const thirdColumn = view.columns[2]
		if (secondRow === undefined || thirdColumn === undefined) {
			throw new Error("Expected a row and column")
		}

		example.world.run(selectRow, {
			table: example.table,
			row: secondRow,
			additive: false,
		})
		expect(example.world.query(SelectedCell)).toHaveLength(4)

		example.world.run(selectColumn, {
			table: example.table,
			column: thirdColumn,
			additive: false,
		})
		expect(example.world.query(SelectedCell)).toHaveLength(4)
	})

	it("notifies only selection subscribers for cells that changed", () => {
		const example = createTableExample(2)
		const view = requireView(example)
		const selected = view.rows[0]?.cells[0]
		const neighbor = view.rows[0]?.cells[1]
		if (selected === undefined || neighbor === undefined) {
			throw new Error("Expected cells")
		}

		const selectedListener = vi.fn()
		const neighborListener = vi.fn()
		const rowListener = vi.fn()
		example.world.subscribe(selectedListener, {
			entity: selected,
			component: SelectedCell,
		})
		example.world.subscribe(neighborListener, {
			entity: neighbor,
			component: SelectedCell,
		})
		example.world.subscribe(rowListener, { components: [UserRow] })

		example.world.run(beginCellSelection, {
			table: example.table,
			cell: selected,
			additive: false,
		})

		expect(selectedListener).toHaveBeenCalledTimes(1)
		expect(neighborListener).not.toHaveBeenCalled()
		expect(rowListener).not.toHaveBeenCalled()
	})
})

describe("in-place editing", () => {
	it("keeps invalid drafts and blocks filter changes until cancel", () => {
		const example = createTableExample(5)
		const view = requireView(example)
		const emailCell = view.rows[0]?.cells[1]
		if (emailCell === undefined) {
			throw new Error("Expected an email cell")
		}

		example.world.run(beginCellEdit, {
			table: example.table,
			cell: emailCell,
		})
		example.world.run(updateCellDraft, {
			cell: emailCell,
			value: "not-an-email",
		})

		const changed = example.world.run(setTableFilters, {
			table: example.table,
			patch: { search: "grace" },
		})

		expect(changed).toBe(false)
		expect(example.world.get(example.table, TableFilters)?.search).toBe("")
		expect(example.world.get(emailCell, CellDraft)?.value).toBe("not-an-email")
		expect(example.world.get(emailCell, CellError)?.message).toContain("@")

		example.world.run(cancelCellEdit, { cell: emailCell })
		expect(example.world.get(emailCell, CellDraft)).toBeUndefined()
		expect(example.world.get(emailCell, CellError)).toBeUndefined()
	})

	it("commits to the row source and removes transient edit state", () => {
		const example = createTableExample(5)
		const view = requireView(example)
		const emailCell = view.rows[0]?.cells[1]
		if (emailCell === undefined) {
			throw new Error("Expected an email cell")
		}
		const address = example.world.get(emailCell, TableCell)
		if (address === undefined) {
			throw new Error("Expected a cell address")
		}

		example.world.run(beginCellEdit, {
			table: example.table,
			cell: emailCell,
		})
		example.world.run(updateCellDraft, {
			cell: emailCell,
			value: "updated@example.com",
		})
		const committed = example.world.run(commitCellEdit, {
			table: example.table,
			cell: emailCell,
		})

		expect(committed).toBe(true)
		expect(example.world.get(address.row, UserRow)?.email).toBe(
			"updated@example.com",
		)
		expect(example.world.get(emailCell, CellDraft)).toBeUndefined()
		expect(example.world.get(emailCell, CellError)).toBeUndefined()
	})

	it("drops selection when an edit removes its row from the active view", () => {
		const example = createTableExample(8)
		const firstView = requireView(example)
		const nameCell = firstView.rows[0]?.cells[0]
		if (nameCell === undefined) {
			throw new Error("Expected a name cell")
		}
		const address = example.world.get(nameCell, TableCell)
		const row = address && example.world.get(address.row, UserRow)
		if (address === undefined || row === undefined) {
			throw new Error("Expected row data")
		}

		example.world.run(setTableFilters, {
			table: example.table,
			patch: { search: row.name },
		})
		example.world.run(beginCellEdit, {
			table: example.table,
			cell: nameCell,
		})
		example.world.run(updateCellDraft, {
			cell: nameCell,
			value: "A name outside the current search",
		})
		example.world.run(commitCellEdit, {
			table: example.table,
			cell: nameCell,
		})

		expect(requireView(example).rows).toHaveLength(0)
		expect(example.world.has(nameCell, SelectedCell)).toBe(false)
		expect(example.world.has(nameCell, FocusedCell)).toBe(false)
	})
})
