import type { Entity, System } from "ecsplain"
import { commitActiveEdit } from "./editing-systems"
import {
	DEFAULT_FILTERS,
	DEFAULT_SORT,
	TableColumn,
	TableFilters,
	type TableFiltersData,
	TableSort,
} from "./model"
import { clearSelectionState } from "./selection-state"
import { rebuildTableView } from "./view-system"

interface TableInput {
	readonly table: Entity
}

interface SetFiltersInput extends TableInput {
	readonly patch: Partial<TableFiltersData>
}

interface ToggleSortInput extends TableInput {
	readonly column: Entity
}

export const setTableFilters: System<SetFiltersInput, boolean> = (
	world,
	{ table, patch },
) => {
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	const current = world.get(table, TableFilters)
	if (current === undefined) {
		throw new Error("The table is missing filter state")
	}

	world.set(table, TableFilters, { ...current, ...patch })
	clearSelectionState(world, table)
	world.run(rebuildTableView, { table })
	return true
}

export const toggleTableSort: System<ToggleSortInput, boolean> = (
	world,
	{ table, column },
) => {
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	const columnData = world.get(column, TableColumn)
	const current = world.get(table, TableSort)
	if (columnData === undefined || current === undefined) {
		throw new Error("The table is missing column or sort state")
	}

	world.set(table, TableSort, {
		column: columnData.key,
		direction:
			current.column === columnData.key && current.direction === "asc"
				? "desc"
				: "asc",
	})
	clearSelectionState(world, table)
	world.run(rebuildTableView, { table })
	return true
}

export const resetTable: System<TableInput, boolean> = (world, { table }) => {
	if (!world.run(commitActiveEdit, { table })) {
		return false
	}

	world.set(table, TableFilters, DEFAULT_FILTERS)
	world.set(table, TableSort, DEFAULT_SORT)
	clearSelectionState(world, table)
	world.run(rebuildTableView, { table })
	return true
}
