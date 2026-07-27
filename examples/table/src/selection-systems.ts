import type { Entity, System } from "ecsplain"
import { commitActiveEdit } from "./editing-systems"
import { SelectionGesture } from "./model"
import {
	applySelection,
	clearSelectionState,
	findCellPosition,
	rectangleCells,
	requireTableView,
	selectedCells,
	setFocusedCell,
} from "./selection-state"

interface TableInput {
	readonly table: Entity
}

interface BeginSelectionInput extends TableInput {
	readonly cell: Entity
	readonly additive: boolean
}

interface ExtendSelectionInput extends TableInput {
	readonly cell: Entity
}

interface RowSelectionInput extends TableInput {
	readonly row: Entity
	readonly additive: boolean
}

interface ColumnSelectionInput extends TableInput {
	readonly column: Entity
	readonly additive: boolean
}

export const beginCellSelection: System<BeginSelectionInput, boolean> = (
	world,
	{ table, cell, additive },
) => {
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	const view = requireTableView(world, table)
	const position = findCellPosition(view, cell)
	if (position === undefined) {
		return false
	}

	const baseSelection = additive ? selectedCells(world) : new Set<Entity>()
	const desired = new Set(baseSelection)
	for (const selected of rectangleCells(view, position, position)) {
		desired.add(selected)
	}

	applySelection(world, desired)
	setFocusedCell(world, cell)
	world.set(table, SelectionGesture, {
		anchor: cell,
		current: cell,
		additive,
		baseSelection: [...baseSelection],
	})
	return true
}

export const extendCellSelection: System<ExtendSelectionInput, boolean> = (
	world,
	{ table, cell },
) => {
	const gesture = world.get(table, SelectionGesture)
	if (gesture === undefined || gesture.current === cell) {
		return gesture !== undefined
	}

	const view = requireTableView(world, table)
	const anchor = findCellPosition(view, gesture.anchor)
	const current = findCellPosition(view, cell)
	if (anchor === undefined || current === undefined) {
		return false
	}

	const desired = new Set(gesture.baseSelection)
	for (const selected of rectangleCells(view, anchor, current)) {
		desired.add(selected)
	}

	applySelection(world, desired)
	world.set(table, SelectionGesture, { ...gesture, current: cell })
	return true
}

export const finishCellSelection: System<TableInput> = (world, { table }) => {
	world.remove(table, SelectionGesture)
}

export const selectRow: System<RowSelectionInput, boolean> = (
	world,
	{ table, row, additive },
) => {
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	const view = requireTableView(world, table)
	const viewRow = view.rows.find(candidate => candidate.row === row)
	if (viewRow === undefined) {
		return false
	}

	const desired = additive ? selectedCells(world) : new Set<Entity>()
	for (const cell of viewRow.cells) {
		desired.add(cell)
	}
	applySelection(world, desired)
	setFocusedCell(world, viewRow.cells[0])
	return true
}

export const selectColumn: System<ColumnSelectionInput, boolean> = (
	world,
	{ table, column, additive },
) => {
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	const view = requireTableView(world, table)
	const columnIndex = view.columns.indexOf(column)
	if (columnIndex === -1) {
		return false
	}

	const cells = view.rows.flatMap(row => {
		const cell = row.cells[columnIndex]
		return cell === undefined ? [] : [cell]
	})
	const desired = additive ? selectedCells(world) : new Set<Entity>()
	for (const cell of cells) {
		desired.add(cell)
	}
	applySelection(world, desired)
	setFocusedCell(world, cells[0])
	return true
}

export const clearSelection: System<TableInput, boolean> = (
	world,
	{ table },
) => {
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	clearSelectionState(world, table)
	return true
}
