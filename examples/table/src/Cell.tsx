import type { Entity } from "ecsplain"
import { useComponent, useComponentSelector, useWorld } from "ecsplain/react"
import {
	type ChangeEvent,
	type KeyboardEvent,
	type PointerEvent,
	useEffect,
	useRef,
} from "react"
import { columnBehaviors } from "./columns"
import {
	beginCellEdit,
	cancelCellEdit,
	commitCellEdit,
	focusCell,
	updateCellDraft,
} from "./editing-systems"
import {
	CellDraft,
	CellError,
	FocusedCell,
	SelectedCell,
	TableCell,
	TableColumn,
	UserRow,
} from "./model"
import {
	beginCellSelection,
	extendCellSelection,
	finishCellSelection,
} from "./selection-systems"

interface CellProps {
	readonly cell: Entity
	readonly column: Entity
	readonly columnIndex: number
	readonly row: Entity
	readonly rowIndex: number
	readonly table: Entity
}

export function Cell({
	cell,
	column,
	columnIndex,
	row,
	rowIndex,
	table,
}: CellProps) {
	const world = useWorld()
	const address = useComponent(cell, TableCell)
	const metadata = useComponent(column, TableColumn)
	const selected = useComponent(cell, SelectedCell) === true
	const focused = useComponent(cell, FocusedCell) === true
	const draft = useComponent(cell, CellDraft)
	const error = useComponent(cell, CellError)
	const columnKey = metadata?.key ?? "name"
	const value = useComponentSelector(row, UserRow, user =>
		columnBehaviors[columnKey].read(user),
	)
	const editorRef = useRef<HTMLInputElement | HTMLSelectElement>(null)
	const editing = draft !== undefined

	useEffect(() => {
		if (!editing) {
			return
		}

		editorRef.current?.focus()
		if (editorRef.current instanceof HTMLInputElement) {
			editorRef.current.select()
		}
	}, [editing])

	if (address === undefined || metadata === undefined || value === undefined) {
		throw new Error("A rendered cell is missing its ECS data")
	}

	const beginSelection = (event: PointerEvent<HTMLButtonElement>) => {
		if (event.button !== 0) {
			return
		}

		const started = world.run(beginCellSelection, {
			table,
			cell,
			additive: event.ctrlKey || event.metaKey,
		})
		if (started) {
			event.currentTarget.focus()
			event.preventDefault()
		}
	}

	const extendSelection = (event: PointerEvent<HTMLButtonElement>) => {
		if (event.buttons === 1) {
			world.run(extendCellSelection, { table, cell })
		}
	}

	const startEditing = () => {
		world.run(beginCellEdit, { table, cell })
	}

	const handleCellKey = (event: KeyboardEvent<HTMLButtonElement>) => {
		if (event.key === "Enter") {
			event.preventDefault()
			startEditing()
		}
	}

	const changeDraft = (
		event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		world.run(updateCellDraft, {
			cell,
			value: event.currentTarget.value,
		})
	}

	const commit = (element: HTMLInputElement | HTMLSelectElement) => {
		const committed = world.run(commitCellEdit, { table, cell })
		if (!committed) {
			element.focus()
		}
	}

	const handleEditorKey = (
		event: KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
	) => {
		if (event.key === "Enter") {
			event.preventDefault()
			commit(event.currentTarget)
		}
		if (event.key === "Escape") {
			event.preventDefault()
			world.run(cancelCellEdit, { cell })
		}
	}

	const errorId = `cell-error-${cell}`

	return (
		<td
			className={selected ? "is-selected" : undefined}
			data-cell={cell}
			data-testid={`cell-${rowIndex}-${columnIndex}`}
		>
			{!editing ? (
				<button
					type="button"
					className="cell-button"
					aria-label={`${metadata.label}: ${value}`}
					aria-pressed={selected}
					data-focused={focused || undefined}
					onFocus={() => world.run(focusCell, { table, cell })}
					onPointerDown={beginSelection}
					onPointerEnter={extendSelection}
					onPointerUp={() => world.run(finishCellSelection, { table })}
					onDoubleClick={startEditing}
					onKeyDown={handleCellKey}
				>
					{value}
				</button>
			) : (
				<div
					className="cell-editor"
					onPointerDown={event => event.stopPropagation()}
				>
					{metadata.control.type === "text" ? (
						<input
							ref={editorRef as React.RefObject<HTMLInputElement>}
							data-testid="cell-editor"
							aria-label={`Edit ${metadata.label}`}
							aria-invalid={error !== undefined}
							aria-describedby={error ? errorId : undefined}
							value={draft.value}
							onChange={changeDraft}
							onKeyDown={handleEditorKey}
							onBlur={event => commit(event.currentTarget)}
						/>
					) : (
						<select
							ref={editorRef as React.RefObject<HTMLSelectElement>}
							data-testid="cell-editor"
							aria-label={`Edit ${metadata.label}`}
							aria-invalid={error !== undefined}
							aria-describedby={error ? errorId : undefined}
							value={draft.value}
							onChange={changeDraft}
							onKeyDown={handleEditorKey}
							onBlur={event => commit(event.currentTarget)}
						>
							{metadata.control.options.map(option => (
								<option key={option} value={option}>
									{option}
								</option>
							))}
						</select>
					)}
					{error && (
						<span id={errorId} className="cell-error" role="alert">
							{error.message}
						</span>
					)}
				</div>
			)}
		</td>
	)
}
