import type { Entity } from "ecsplain"
import { useComponent, useQuery, useWorld } from "ecsplain/react"
import type { ChangeEvent } from "react"
import { roles, statuses } from "./columns"
import { SelectedCell, TableFilters, type TableFiltersData } from "./model"
import { clearSelection } from "./selection-systems"
import { TableGrid } from "./TableGrid"
import { resetTable, setTableFilters } from "./table-systems"

function SelectionToolbar({ table }: { readonly table: Entity }) {
	const world = useWorld()
	const selectedCount = useQuery(SelectedCell).length

	return (
		<div className="table-toolbar">
			<output data-testid="selected-count">
				{selectedCount} {selectedCount === 1 ? "cell" : "cells"} selected
			</output>
			<button
				className="quiet-button"
				type="button"
				disabled={selectedCount === 0}
				onClick={() => world.run(clearSelection, { table })}
			>
				Clear selection
			</button>
		</div>
	)
}

export function App({ table }: { readonly table: Entity }) {
	const world = useWorld()
	const filters = useComponent(table, TableFilters)

	if (filters === undefined) {
		throw new Error("The table is missing filter state")
	}

	const updateFilter =
		<Key extends keyof TableFiltersData>(key: Key) =>
		(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
			world.run(setTableFilters, {
				table,
				patch: { [key]: event.currentTarget.value },
			})
		}

	return (
		<main className="page-shell">
			<header className="hero">
				<p className="eyebrow">Ecsplain example</p>
				<h1>Entity-driven data grid</h1>
				<p>
					Filtering, sorting, cell selection, and in-place editing are
					synchronous ECS systems. React only renders scoped snapshots.
				</p>
			</header>

			<section className="panel filters" aria-label="Table filters">
				<label>
					<span>Search</span>
					<input
						aria-label="Search users"
						type="search"
						value={filters.search}
						onChange={updateFilter("search")}
						placeholder="Name or email"
					/>
				</label>

				<label>
					<span>Role</span>
					<select
						aria-label="Filter by role"
						value={filters.role}
						onChange={updateFilter("role")}
					>
						<option value="all">All roles</option>
						{roles.map(role => (
							<option key={role} value={role}>
								{role}
							</option>
						))}
					</select>
				</label>

				<label>
					<span>Status</span>
					<select
						aria-label="Filter by status"
						value={filters.status}
						onChange={updateFilter("status")}
					>
						<option value="all">All statuses</option>
						{statuses.map(status => (
							<option key={status} value={status}>
								{status}
							</option>
						))}
					</select>
				</label>

				<button
					className="secondary-button"
					type="button"
					onClick={() => world.run(resetTable, { table })}
				>
					Reset table
				</button>
			</section>

			<section className="panel table-panel">
				<SelectionToolbar table={table} />

				<TableGrid table={table} />
			</section>
		</main>
	)
}
