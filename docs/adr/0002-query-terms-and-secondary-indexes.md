---
status: accepted
---

# Add reusable query terms and component-value indexes

Ecsplain queries accept required component tokens plus `optional` and `without`
terms. `defineQuery` freezes those terms in a reusable descriptor that can be
evaluated by `world.query`, `world.single`, `useQuery`, and
`useQuerySelector`.

A normal token affects membership and contributes data to the result.
`optional(token)` contributes data or `undefined` without affecting
membership. `without(token)` excludes matching entities and contributes no
data. Every query starts with a required token, so evaluation always has a
bounded component store from which to begin.

Queries remain deterministic snapshots. Definitions do not cache entities and
do not become live collections. React subscriptions include every token in the
definition because required, optional, and excluded component changes can all
change the observable result.

Secondary indexes map a component's complete value to entity IDs and update
synchronously with component lifecycle operations. Non-unique indexes return
matching IDs in deterministic order. Unique indexes return one ID and reject a
conflicting `set` or `spawn` before it changes world state.

## Considered options

- Live archetypal queries were rejected because they would introduce a second
  mutable collection model and weaken the current snapshot iteration
  guarantee.
- Arbitrary value predicates were deferred because native array filtering is
  explicit, while reactive predicate caching would need additional invalidation
  and equality semantics.
- Index selector functions were rejected for the initial API. Indexing the
  complete component value keeps updates mechanical and makes scalar key
  components such as `CustomerId` or `TenantId` explicit.
- Automatic relationship ownership and cascade deletion were rejected because
  an index provides lookup, not domain-specific lifecycle policy.

## Consequences

- Query definitions can be shared between systems and React without changing
  snapshot semantics.
- `useQuerySelector` can suppress renders when its selected result stays equal.
- Index reads made inside a system observe preceding writes from that system.
- Object-valued index keys follow JavaScript `Map` identity rules; durable keys
  should use scalar components.
- Adding an index does not change entity identity, serialization, ownership, or
  deletion behavior.
