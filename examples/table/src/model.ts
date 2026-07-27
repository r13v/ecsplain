import { defineComponent, defineQuery, type Entity, type World } from "ecsplain"

export type Role = "Admin" | "Editor" | "Viewer"
export type Status = "Active" | "Inactive"

export interface UserRowData {
	readonly name: string
	readonly email: string
	readonly role: Role
	readonly status: Status
}

export type ColumnKey = keyof UserRowData

type ColumnControl =
	| { readonly type: "text" }
	| {
			readonly type: "select"
			readonly options: readonly string[]
	  }

export interface TableColumnData {
	readonly key: ColumnKey
	readonly label: string
	readonly control: ColumnControl
	readonly order: number
	readonly visible: boolean
}

export interface TableCellData {
	readonly row: Entity
	readonly column: Entity
}

export interface TableFiltersData {
	readonly search: string
	readonly role: Role | "all"
	readonly status: Status | "all"
}

export interface TableSortData {
	readonly column: ColumnKey
	readonly direction: "asc" | "desc"
}

interface TableViewRow {
	readonly row: Entity
	readonly cells: readonly Entity[]
}

export interface TableViewData {
	readonly columns: readonly Entity[]
	readonly rows: readonly TableViewRow[]
}

export interface SelectionGestureData {
	readonly anchor: Entity
	readonly current: Entity
	readonly additive: boolean
	readonly baseSelection: readonly Entity[]
}

export interface CellDraftData {
	readonly value: string
}

export interface CellErrorData {
	readonly message: string
}

export interface TableExample {
	readonly world: World
	readonly table: Entity
}

export const UserRow = defineComponent<UserRowData>("UserRow")
export const TableColumn = defineComponent<TableColumnData>("TableColumn")
export const TableCell = defineComponent<TableCellData>("TableCell")
export const TableFilters = defineComponent<TableFiltersData>("TableFilters")
export const TableSort = defineComponent<TableSortData>("TableSort")
export const TableView = defineComponent<TableViewData>("TableView")
export const SelectedCell = defineComponent<true>("SelectedCell")
export const FocusedCell = defineComponent<true>("FocusedCell")
export const SelectionGesture =
	defineComponent<SelectionGestureData>("SelectionGesture")
export const CellDraft = defineComponent<CellDraftData>("CellDraft")
export const CellError = defineComponent<CellErrorData>("CellError")
export const SelectedCells = defineQuery(SelectedCell)

export const DEFAULT_FILTERS: TableFiltersData = Object.freeze({
	search: "",
	role: "all",
	status: "all",
})

export const DEFAULT_SORT: TableSortData = Object.freeze({
	column: "name",
	direction: "asc",
})
