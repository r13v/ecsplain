# ecsplain

`ecsplain` is a small typed Entity Component System for application state. It
keeps the ECS core independent from React while providing scoped subscriptions
through `ecsplain/react`.

The project intentionally favors explicit data flow over game-engine features:

- entities are opaque numeric identities;
- components are passive typed data;
- systems are synchronous functions;
- component values are replaced instead of mutated in place;
- queries return deterministic snapshots;
- React consumers subscribe only to the component scopes they read.

## Requirements

- Node.js 24 or newer
- React 19 for `ecsplain/react`

## Install

```sh
npm install ecsplain
```

## Learn

Start with the [progressive tutorial](./docs/tutorial.md). It introduces the
core API from an empty world, connects it to React, and then develops the table,
dynamic-form, and invoice-approval examples as reusable application patterns.
The remaining scenarios cover CRUD, optimistic updates, notifications,
overlays, drag-and-drop, async validation, multiple feature ownership, routing,
and permissions.

## Core API

```ts
import {
	createWorld,
	defineComponent,
	defineQuery,
	optional,
	type System,
	type SystemMiddleware,
	without,
} from "ecsplain"

const Position = defineComponent<{ x: number; y: number }>("Position")
const Selected = defineComponent<true>("Selected")
const Archived = defineComponent<true>("Archived")

const world = createWorld()
const entity = world.spawn(
	[Position, { x: 0, y: 0 }],
	[Selected, true],
)
const visiblePositions = defineQuery(
	Position,
	optional(Selected),
	without(Archived),
)

const move: System<{ x: number; y: number }> = (
	currentWorld,
	input,
) => {
	currentWorld.set(entity, Position, input)
}

world.run(move, { x: 12, y: 8 })

for (const [currentEntity, position, selected] of world.query(
	visiblePositions,
)) {
	console.log(currentEntity, position, selected === true)
}
```

`spawn` creates an entity with a typed group of components in one notification
batch. `get` returns `undefined` for a missing component; `require` throws when
the component is an application invariant. `single` requires exactly one query
result.

Queries can be written inline or reused through `defineQuery`. A normal token
is required and returned, `optional(token)` returns a value or `undefined`, and
`without(token)` excludes matching entities without adding data to the result
tuple. All queries remain deterministic snapshots rather than live
collections.

`world.run` batches subscriber notifications. Nested systems join their outer
batch. A failed system does not roll changes back: already-applied changes stay
in the world, subscribers are notified once, and the error is rethrown.

### System middleware

`createWorld` accepts optional synchronous observing middleware:

```ts
const trace: SystemMiddleware = (execution, next) => {
	const result = next()
	console.info(execution.system.name, execution.depth)
	return result
}

const worldWithTracing = createWorld({ middleware: [trace] })
```

Middleware runs around every `world.run`, including nested runs. Array order is
outside-in, so the first middleware is the outermost middleware. Depth is
zero-based: an application entry system has `depth: 0`, and its directly nested
system has `depth: 1`.

Middleware observes execution only. It receives the exact system identity and
unchanged input value, must call `next()` exactly once, must return the same
result that `next()` produced, and must rethrow the same value if `next()`
throws. The public identity is intentionally non-callable. The dispatcher
enforces these rules at runtime. Middleware is synchronous, and subscriber
notification happens after the outer batch, outside the middleware boundary.

Use `Function.name` only for diagnostics; bundlers may change it. Tracing code
should avoid logging raw input by default because system input can contain
sensitive application data.

Component reads are readonly at the type level. The runtime does not clone or
freeze component values, so every observable change must pass a new value to
`set` or `update`.

### Secondary indexes

External IDs and other lookup keys should remain components:

```ts
const CustomerId = defineComponent<string>("CustomerId")
const customersById = world.index(CustomerId, { unique: true })
const customer = world.spawn([CustomerId, "customer-42"])

customersById.get("customer-42") === customer
```

Without `{ unique: true }`, `get` returns every matching entity in deterministic
entity-ID order. Indexes track `set`, `update`, `remove`, and `destroy`
synchronously, including reads made inside a running system. Index keys use
JavaScript `Map` equality over the complete component value; prefer scalar key
components for durable IDs.

## React API

```tsx
import {
	WorldProvider,
	useComponent,
	useQuery,
	useQuerySelector,
} from "ecsplain/react"

function SelectedPositions() {
	const rows = useQuery(visiblePositions)
	return rows.map(([entity, position]) => (
		<output key={entity}>
			{position.x}, {position.y}
		</output>
	))
}

function VisiblePositionCount() {
	const count = useQuerySelector(visiblePositions, rows => rows.length)
	return <output>{count}</output>
}

root.render(
	<WorldProvider world={world}>
		<SelectedPositions />
	</WorldProvider>,
)
```

The React entry point exports:

- `WorldProvider`
- `useWorld`
- `useQuery`
- `useQuerySelector`
- `useComponent`
- `useComponentSelector`

`useQuery` subscribes to every required, optional, and excluded token in its
query. `useQuerySelector` accepts a `defineQuery` descriptor and rerenders only
when its selected result changes according to `Object.is` or an optional
equality function. `useComponent` and `useComponentSelector` subscribe to one
entity-token pair, allowing cell-level updates without waking unrelated rows.

## Examples

```sh
npm install
npm run dev:table
npm run dev:form
npm run dev:invoice
```

- [`examples/table`](./examples/table) demonstrates filters, sorting,
  rectangular and additive cell selection, and in-place editing.
- [`examples/dynamic-form`](./examples/dynamic-form) demonstrates a form whose
  active field entities change with the selected delivery method.
- [`examples/invoice-approval`](./examples/invoice-approval) demonstrates
  TanStack Query, MSW, monotonic server reconciliation, optimistic approval
  workflow state, URL-fixed feature variants, and system tracing middleware.

All examples keep application state and behavior in ECS. React translates
browser events into plain system inputs and renders ECS snapshots.

The tutorial explains their architecture and the reasoning behind each
component and system: [Learning ECSplain through application
UI](./docs/tutorial.md).

## Development

```sh
npm run check
npm run typecheck
npm test
npm run build
npm run build:examples
npm run build:invoice
npx playwright install chromium
npm run test:e2e
npm run knip
```

`npm run check:fix` applies Biome formatting and safe fixes.

## Deliberate limits

`ecsplain` does not include archetypes, entity ID reuse, global resources,
automatic system scheduling, async systems, rollback, proxy observation,
relationship ownership, or cascade deletion. Middleware observes explicitly-run
systems only; it does not introduce scheduling, async execution, side-effect
orchestration, or rollback. Secondary indexes provide lookup, not ownership or
deletion semantics. These are explicit non-goals for the current educational
scope.
