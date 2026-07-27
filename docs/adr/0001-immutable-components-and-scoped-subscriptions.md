---
status: accepted
---

# Use immutable component replacement and scoped subscriptions

Ecsplain treats component values as immutable and observes changes only through explicit `set`, `update`, and `remove` operations. Each batch records changed component tokens and entity-token pairs so React consumers can subscribe globally, by token set, or by exact component; this keeps external-store snapshots reliable without making cell-level interactions rerender unrelated table content.

## Considered Options

- In-place mutation with `touch()` was rejected because missed notifications can leave React with stale state.
- Proxy observation was rejected because it adds hidden runtime behavior and complexity.
- A single world-wide subscription was rejected because high-frequency cell selection and editing would wake unrelated queries and rows.

## Consequences

- Component reads are readonly by contract, but the runtime does not clone or freeze values.
- A real update must produce a different value according to `Object.is`.
- `World` maintains global and scoped change versions for `useSyncExternalStore`.
- `useQuery` and `useQuerySelector` subscribe to every required, optional, and excluded query token, while `useComponent` and `useComponentSelector` subscribe to an exact entity-token pair.
