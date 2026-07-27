# ECS

This context defines the shared language for modeling application state and behavior with an Entity Component System.

## Language

**Entity**: An opaque identity to which components can be attached.
_Avoid_: Object, model

**Component**: Passive, typed data attached to an entity; it contains no behavior.
_Avoid_: React component, component class

**Component Token**: A named, unique runtime identity for a component and the shape of its value.
_Avoid_: Component class, string key

**System**: Behavior that selects entities by their components and updates the world.
_Avoid_: Component method

**Query**: A deterministic snapshot selected by required, optional, and excluded component terms. It returns the entity, required values, and optional values.
_Avoid_: Live query, selector

**Query Definition**: An immutable reusable description created by `defineQuery`; systems and React can evaluate the same terms against a world.
_Avoid_: Cached query, live collection

**Secondary Index**: A synchronous lookup from one complete component value to matching entity IDs. A unique index also rejects duplicate values.
_Avoid_: Relationship, external cache

**Row Entity**: An entity that represents one logical record in a table and owns its authoritative typed record data.
_Avoid_: DOM row, row index

**Column Entity**: An entity that represents one stable column and identifies the field it reads from row data.
_Avoid_: Column index

**Cell Entity**: An entity that represents one stable row-and-column coordinate; it owns cell-specific state but not the authoritative value.
_Avoid_: DOM cell, cell value

**Selected Cell**: A cell entity included in the current table selection.
_Avoid_: Focused cell, active cell

**Focused Cell**: The sole cell entity that receives keyboard editing intent; it may be one of many selected cells.
_Avoid_: Selected cell

**Cell Draft**: Temporary, uncommitted input owned by a cell entity while that cell is being edited.
_Avoid_: Cell value, row data

**Table View**: A derived snapshot that orders visible columns, rows, and their cell entities for rendering and interaction.
_Avoid_: Source data, table model

**Batch**: One synchronous group of world changes that produces at most one subscriber notification; it does not provide rollback.
_Avoid_: Transaction

**World**: The owner of entities and their components, through which systems observe and update ECS state.
_Avoid_: React store
