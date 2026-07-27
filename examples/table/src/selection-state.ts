import type { Entity, World } from "ecsplain"
import {
	FocusedCell,
	SelectedCell,
	SelectionGesture,
	TableView,
	type TableViewData,
} from "./model"

export interface CellPosition {
	readonly row: number
	readonly column: number
}

export function requireTableView(
	world: World,
	table: Entity,
): Readonly<TableViewData> {
	const view = world.get(table, TableView)
	if (view === undefined) {
		throw new Error("The table does not have a derived view")
	}
	return view
}

export function selectedCells(world: World): Set<Entity> {
	return new Set(world.query(SelectedCell).map(([cell]) => cell))
}

export function applySelection(
	world: World,
	desired: ReadonlySet<Entity>,
): void {
	const current = selectedCells(world)

	for (const cell of current) {
		if (!desired.has(cell)) {
			world.remove(cell, SelectedCell)
		}
	}
	for (const cell of desired) {
		if (!current.has(cell)) {
			world.set(cell, SelectedCell, true)
		}
	}
}

export function setFocusedCell(world: World, cell: Entity | undefined): void {
	for (const [focused] of world.query(FocusedCell)) {
		if (focused !== cell) {
			world.remove(focused, FocusedCell)
		}
	}

	if (cell !== undefined && !world.has(cell, FocusedCell)) {
		world.set(cell, FocusedCell, true)
	}
}

export function clearSelectionState(world: World, table: Entity): void {
	for (const [cell] of world.query(SelectedCell)) {
		world.remove(cell, SelectedCell)
	}
	for (const [cell] of world.query(FocusedCell)) {
		world.remove(cell, FocusedCell)
	}
	world.remove(table, SelectionGesture)
}

export function reconcileSelectionWithView(world: World, table: Entity): void {
	const view = requireTableView(world, table)
	const visibleCells = new Set(view.rows.flatMap(row => [...row.cells]))

	for (const [cell] of world.query(SelectedCell)) {
		if (!visibleCells.has(cell)) {
			world.remove(cell, SelectedCell)
		}
	}
	for (const [cell] of world.query(FocusedCell)) {
		if (!visibleCells.has(cell)) {
			world.remove(cell, FocusedCell)
		}
	}
}

export function findCellPosition(
	view: Readonly<TableViewData>,
	cell: Entity,
): CellPosition | undefined {
	for (const [rowIndex, row] of view.rows.entries()) {
		const columnIndex = row.cells.indexOf(cell)
		if (columnIndex !== -1) {
			return { row: rowIndex, column: columnIndex }
		}
	}

	return undefined
}

export function rectangleCells(
	view: Readonly<TableViewData>,
	from: CellPosition,
	to: CellPosition,
): Set<Entity> {
	const cells = new Set<Entity>()
	const firstRow = Math.min(from.row, to.row)
	const lastRow = Math.max(from.row, to.row)
	const firstColumn = Math.min(from.column, to.column)
	const lastColumn = Math.max(from.column, to.column)

	for (let rowIndex = firstRow; rowIndex <= lastRow; rowIndex += 1) {
		const row = view.rows[rowIndex]
		if (row === undefined) {
			continue
		}
		for (
			let columnIndex = firstColumn;
			columnIndex <= lastColumn;
			columnIndex += 1
		) {
			const cell = row.cells[columnIndex]
			if (cell !== undefined) {
				cells.add(cell)
			}
		}
	}

	return cells
}
