import { createWorld } from "ecsplain"
import { columnDefinitions } from "./columns"
import { createUsers } from "./data"
import {
	DEFAULT_FILTERS,
	DEFAULT_SORT,
	TableCell,
	TableColumn,
	type TableExample,
	TableFilters,
	TableSort,
	UserRow,
} from "./model"
import { rebuildTableView } from "./view-system"

export function createTableExample(rowCount = 200): TableExample {
	const world = createWorld()
	const table = world.create()

	world.run(currentWorld => {
		currentWorld.set(table, TableFilters, DEFAULT_FILTERS)
		currentWorld.set(table, TableSort, DEFAULT_SORT)

		const columns = columnDefinitions.map(definition => {
			const column = currentWorld.create()
			currentWorld.set(column, TableColumn, definition)
			return column
		})

		for (const user of createUsers(rowCount)) {
			const row = currentWorld.create()
			currentWorld.set(row, UserRow, user)

			for (const column of columns) {
				const cell = currentWorld.create()
				currentWorld.set(cell, TableCell, { row, column })
			}
		}

		currentWorld.run(rebuildTableView, { table })
	})

	return { world, table }
}
