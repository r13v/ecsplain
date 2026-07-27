import type { Entity } from "ecsplain"
import { useComponent, useComponentSelector, useWorld } from "ecsplain/react"
import type { PointerEvent } from "react"
import { Cell } from "./Cell"
import { TableColumn, TableSort, TableView, UserRow } from "./model"
import {
	finishCellSelection,
	selectColumn,
	selectRow,
} from "./selection-systems"
import { toggleTableSort } from "./table-systems"

function ColumnHeader({
	column,
	table,
}: {
	readonly column: Entity
	readonly table: Entity
}) {
	const world = useWorld()
	const metadata = useComponent(column, TableColumn)
	const sort = useComponent(table, TableSort)

	if (metadata === undefined || sort === undefined) {
		throw new Error("The table is missing column or sort data")
	}

	const activeSort = sort.column === metadata.key
	const ariaSort = activeSort
		? sort.direction === "asc"
			? "ascending"
			: "descending"
		: "none"

	return (
		<th scope="col" aria-sort={ariaSort}>
			<div className="column-heading">
				<button
					type="button"
					className="column-select"
					aria-label={`Select ${metadata.label} column`}
					onClick={event =>
						world.run(selectColumn, {
							table,
							column,
							additive: event.ctrlKey || event.metaKey,
						})
					}
				>
					{metadata.label}
				</button>
				<button
					type="button"
					className="sort-button"
					aria-label={`Sort by ${metadata.label}`}
					onClick={() => world.run(toggleTableSort, { table, column })}
				>
					<span aria-hidden="true">
						{activeSort ? (sort.direction === "asc" ? "↑" : "↓") : "↕"}
					</span>
				</button>
			</div>
		</th>
	)
}

function TableRow({
	cells,
	row,
	rowIndex,
	table,
	columns,
}: {
	readonly cells: readonly Entity[]
	readonly row: Entity
	readonly rowIndex: number
	readonly table: Entity
	readonly columns: readonly Entity[]
}) {
	const world = useWorld()
	const rowName = useComponentSelector(row, UserRow, user => user.name)

	return (
		<tr>
			<th scope="row" className="row-heading">
				<button
					type="button"
					aria-label={`Select row ${rowName ?? rowIndex + 1}`}
					onClick={event =>
						world.run(selectRow, {
							table,
							row,
							additive: event.ctrlKey || event.metaKey,
						})
					}
				>
					{rowIndex + 1}
				</button>
			</th>
			{cells.map((cell, columnIndex) => {
				const column = columns[columnIndex]
				if (column === undefined) {
					throw new Error("The table view has a cell without a column")
				}

				return (
					<Cell
						key={cell}
						cell={cell}
						column={column}
						columnIndex={columnIndex}
						row={row}
						rowIndex={rowIndex}
						table={table}
					/>
				)
			})}
		</tr>
	)
}

export function TableGrid({ table }: { readonly table: Entity }) {
	const world = useWorld()
	const view = useComponent(table, TableView)

	if (view === undefined) {
		throw new Error("The table is missing its derived view")
	}

	const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
		if (event.buttons === 0 || event.type === "pointerleave") {
			world.run(finishCellSelection, { table })
		}
	}

	return (
		<div
			className="table-scroll"
			onPointerUp={finishGesture}
			onPointerLeave={finishGesture}
		>
			<table data-testid="table-grid">
				<thead>
					<tr>
						<th scope="col" className="corner-heading">
							<span className="sr-only">Rows</span>
						</th>
						{view.columns.map(column => (
							<ColumnHeader key={column} column={column} table={table} />
						))}
					</tr>
				</thead>
				<tbody>
					{view.rows.map(({ row, cells }, rowIndex) => (
						<TableRow
							key={row}
							cells={cells}
							columns={view.columns}
							row={row}
							rowIndex={rowIndex}
							table={table}
						/>
					))}
				</tbody>
			</table>

			{view.rows.length === 0 && (
				<p className="empty-state">No users match the current filters.</p>
			)}
		</div>
	)
}
