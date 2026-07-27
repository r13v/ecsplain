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
core API from an empty world, connects it to React, and then develops the table
and dynamic-form examples as reusable application patterns. The second half
covers async data, CRUD, optimistic updates, notifications, overlays,
drag-and-drop, async validation, multiple feature ownership, routing, and
permissions.

## Core API

```ts
import { createWorld, defineComponent, type System } from "ecsplain"

const Position = defineComponent<{ x: number; y: number }>("Position")
const Selected = defineComponent<true>("Selected")

const world = createWorld()
const entity = world.create()

world.set(entity, Position, { x: 0, y: 0 })

const move: System<{ x: number; y: number }> = (
	currentWorld,
	input,
) => {
	currentWorld.set(entity, Position, input)
}

world.run(move, { x: 12, y: 8 })

for (const [currentEntity, position] of world.query(Position)) {
	console.log(currentEntity, position)
}
```

`world.run` batches subscriber notifications. Nested systems join their outer
batch. A failed system does not roll changes back: already-applied changes stay
in the world, subscribers are notified once, and the error is rethrown.

Component reads are readonly at the type level. The runtime does not clone or
freeze component values, so every observable change must pass a new value to
`set` or `update`.

## React API

```tsx
import { WorldProvider, useComponent, useQuery } from "ecsplain/react"

function SelectedPositions() {
	const rows = useQuery(Position, Selected)
	return rows.map(([entity, position]) => (
		<output key={entity}>
			{position.x}, {position.y}
		</output>
	))
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
- `useComponent`
- `useComponentSelector`

`useQuery` subscribes to its component tokens. `useComponent` and
`useComponentSelector` subscribe to one entity-token pair, allowing cell-level
updates without waking unrelated rows.

## Examples

```sh
npm install
npm run dev:table
npm run dev:form
```

- [`examples/table`](./examples/table) demonstrates filters, sorting,
  rectangular and additive cell selection, and in-place editing.
- [`examples/dynamic-form`](./examples/dynamic-form) demonstrates a form whose
  active field entities change with the selected delivery method.

Both examples keep application state and behavior in ECS. React translates
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
npx playwright install chromium
npm run test:e2e
npm run knip
```

`npm run check:fix` applies Biome formatting and safe fixes.

## Deliberate limits

`ecsplain` does not include archetypes, entity ID reuse, global resources,
automatic system scheduling, async systems, rollback, proxy observation,
relationship ownership, or cascade deletion. These are explicit non-goals for
the current educational scope.
