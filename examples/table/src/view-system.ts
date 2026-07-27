import type { Entity, System } from "ecsplain"
import { columnBehaviors } from "./columns"
import {
	TableCell,
	TableColumn,
	TableFilters,
	TableSort,
	TableView,
	type TableViewData,
	UserRow,
} from "./model"

interface RebuildTableViewInput {
	readonly table: Entity
}

export const rebuildTableView: System<RebuildTableViewInput> = (
	world,
	{ table },
) => {
	const filters = world.get(table, TableFilters)
	const sort = world.get(table, TableSort)

	if (filters === undefined || sort === undefined) {
		throw new Error("The table is missing filters or sort state")
	}

	const columns = world
		.query(TableColumn)
		.filter(([, column]) => column.visible)
		.sort(
			([leftEntity, left], [rightEntity, right]) =>
				left.order - right.order || leftEntity - rightEntity,
		)

	const cellsByRow = new Map<Entity, Map<Entity, Entity>>()
	for (const [cell, address] of world.query(TableCell)) {
		let cellsByColumn = cellsByRow.get(address.row)
		if (cellsByColumn === undefined) {
			cellsByColumn = new Map()
			cellsByRow.set(address.row, cellsByColumn)
		}
		cellsByColumn.set(address.column, cell)
	}

	const normalizedSearch = filters.search.trim().toLocaleLowerCase("en")
	const rows = world
		.query(UserRow)
		.filter(([, row]) => {
			const matchesSearch =
				normalizedSearch.length === 0 ||
				row.name.toLocaleLowerCase("en").includes(normalizedSearch) ||
				row.email.toLocaleLowerCase("en").includes(normalizedSearch)
			const matchesRole = filters.role === "all" || row.role === filters.role
			const matchesStatus =
				filters.status === "all" || row.status === filters.status

			return matchesSearch && matchesRole && matchesStatus
		})
		.sort(([leftEntity, left], [rightEntity, right]) => {
			const behavior = columnBehaviors[sort.column]
			const comparison = behavior
				.read(left)
				.localeCompare(behavior.read(right), "en", {
					sensitivity: "base",
				})

			return (
				(sort.direction === "asc" ? comparison : -comparison) ||
				leftEntity - rightEntity
			)
		})
		.map(([row]) => {
			const cellsByColumn = cellsByRow.get(row)
			if (cellsByColumn === undefined) {
				throw new Error(`Row ${row} does not have cell entities`)
			}

			const cells = columns.map(([column]) => {
				const cell = cellsByColumn.get(column)
				if (cell === undefined) {
					throw new Error(`Row ${row} is missing a cell for column ${column}`)
				}
				return cell
			})

			return { row, cells }
		})

	const view: TableViewData = {
		columns: columns.map(([column]) => column),
		rows,
	}
	world.set(table, TableView, view)
}
