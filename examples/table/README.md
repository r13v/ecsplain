# Table example

This example renders 200 user rows with ECS-driven filtering, sorting,
selection, and in-place editing.

```sh
npm run dev:table
```

For a step-by-step explanation, read the
[table tutorial](../../docs/tutorial.md#7-scenario-model-a-data-table).

## ECS model

- A row entity owns the authoritative `UserRow` component.
- A column entity owns passive `TableColumn` metadata.
- A cell entity owns `TableCell { row, column }`, but never duplicates the
  saved value.
- `SelectedCell`, `FocusedCell`, `CellDraft`, and `CellError` are independent
  cell-level components.
- The table entity owns filters, sort state, the active drag gesture, and a
  derived `TableView`.

`TableView` contains visible columns and filtered/sorted rows with aligned cell
entities. Systems rebuild it from `UserRow`, `TableColumn`, and `TableCell`;
React does not filter, sort, or group entities.

## Interaction flow

- Pointer down starts a rectangular selection from an anchor cell.
- Pointer enter extends or shrinks the range.
- `Ctrl`/`Cmd` unions the new range with existing selected cell entities.
- Filtering and sorting clear selection.
- Double-click or Enter creates `CellDraft`.
- Enter or blur validates and commits by replacing `UserRow`.
- Escape removes the draft without changing row data.

The cell renderer uses `useComponentSelector` to read one field from
`UserRow`. Selection changes stay scoped to affected cells and the selection
toolbar. The toolbar uses `useQuerySelector` over the reusable `SelectedCells`
query, so replacing selection component data without changing the count would
not rerender it. Bootstrap uses `world.spawn`, and systems use `world.require`
where table state is an invariant. A committed edit also rebuilds `TableView`
because it may change filter membership or sort order, so that structural
update can rerender the table container.

This example creates one table per world. Supporting multiple tables in one
world requires an ownership component on rows, columns, and cells.
