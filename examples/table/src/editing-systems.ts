import type { Entity, System, World } from "ecsplain"
import { columnBehaviors } from "./columns"
import { CellDraft, CellError, TableCell, TableColumn, UserRow } from "./model"
import {
	applySelection,
	findCellPosition,
	reconcileSelectionWithView,
	requireTableView,
	setFocusedCell,
} from "./selection-state"
import { rebuildTableView } from "./view-system"

interface TableInput {
	readonly table: Entity
}

interface CellInput extends TableInput {
	readonly cell: Entity
}

interface UpdateDraftInput {
	readonly cell: Entity
	readonly value: string
}

function activeDraft(world: World): Entity | undefined {
	const drafts = world.query(CellDraft)
	if (drafts.length > 1) {
		throw new Error("Only one cell can be edited at a time")
	}
	return drafts[0]?.[0]
}

export const commitActiveEdit: System<TableInput, boolean> = (
	world,
	{ table },
) => {
	const cell = activeDraft(world)
	if (cell === undefined) {
		return true
	}

	const draft = world.get(cell, CellDraft)
	const address = world.get(cell, TableCell)
	if (draft === undefined || address === undefined) {
		throw new Error("The edited cell is missing draft or address data")
	}

	const column = world.get(address.column, TableColumn)
	const row = world.get(address.row, UserRow)
	if (column === undefined || row === undefined) {
		throw new Error("The edited cell references missing row or column data")
	}

	const result = columnBehaviors[column.key].commit(row, draft.value)
	if (!result.ok) {
		world.set(cell, CellError, { message: result.error })
		return false
	}

	world.set(address.row, UserRow, result.row)
	world.remove(cell, CellDraft)
	world.remove(cell, CellError)
	world.run(rebuildTableView, { table })
	reconcileSelectionWithView(world, table)
	return true
}

export const focusCell: System<CellInput, boolean> = (
	world,
	{ table, cell },
) => {
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	const view = requireTableView(world, table)
	if (findCellPosition(view, cell) === undefined) {
		return false
	}

	setFocusedCell(world, cell)
	return true
}

export const beginCellEdit: System<CellInput, boolean> = (
	world,
	{ table, cell },
) => {
	const currentDraft = activeDraft(world)
	if (currentDraft === cell) {
		return true
	}
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	const view = requireTableView(world, table)
	if (findCellPosition(view, cell) === undefined) {
		return false
	}

	const address = world.get(cell, TableCell)
	if (address === undefined) {
		throw new Error("The cell is missing its address")
	}
	const column = world.get(address.column, TableColumn)
	const row = world.get(address.row, UserRow)
	if (column === undefined || row === undefined) {
		throw new Error("The cell references missing row or column data")
	}

	applySelection(world, new Set([cell]))
	setFocusedCell(world, cell)
	world.remove(cell, CellError)
	world.set(cell, CellDraft, {
		value: columnBehaviors[column.key].read(row),
	})
	return true
}

export const updateCellDraft: System<UpdateDraftInput> = (
	world,
	{ cell, value },
) => {
	if (!world.has(cell, CellDraft)) {
		throw new Error("The cell is not being edited")
	}

	world.set(cell, CellDraft, { value })
	world.remove(cell, CellError)
}

export const commitCellEdit: System<CellInput, boolean> = (world, { table }) =>
	world.run(commitActiveEdit, { table })

export const cancelCellEdit: System<{ readonly cell: Entity }> = (
	world,
	{ cell },
) => {
	world.remove(cell, CellDraft)
	world.remove(cell, CellError)
}
