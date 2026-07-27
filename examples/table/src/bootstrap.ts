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
	const table = world.run(currentWorld => {
		const table = currentWorld.spawn(
			[TableFilters, DEFAULT_FILTERS],
			[TableSort, DEFAULT_SORT],
		)

		const columns = columnDefinitions.map(definition => {
			return currentWorld.spawn([TableColumn, definition])
		})

		for (const user of createUsers(rowCount)) {
			const row = currentWorld.spawn([UserRow, user])

			for (const column of columns) {
				currentWorld.spawn([TableCell, { row, column }])
			}
		}

		currentWorld.run(rebuildTableView, { table })
		return table
	})

	return { world, table }
}
