---
status: accepted
---

# Use synchronous observing system middleware

Ecsplain supports an optional middleware chain around explicitly-run systems.
The chain is registered with `createWorld({ middleware })`, snapshotted at world
creation, and traversed by every `world.run`, including nested runs.

Middleware is observing middleware. It may measure, trace, or validate the
execution boundary, but it cannot skip a system, replace input, replace a
result, or replace a thrown value. Each middleware receives a readonly
`SystemExecution` containing the exact system function reference, the unchanged
input value, and zero-based depth. The first application entry system has
`depth: 0`; a directly nested `world.run` has `depth: 1`.

Registered array order is outside-in: the first middleware in the array is the
outermost middleware. A middleware must call `next()` exactly once, return the
same value produced by `next()`, and rethrow the same value if `next()` throws.
The dispatcher enforces these rules at runtime, including thrown `undefined`.
Middleware is synchronous and its TypeScript contract does not accept a Promise.

Subscriber notification stays outside the middleware boundary. Middleware wraps
system execution, while the outer `world.run` flushes subscribers after the
outer batch completes. Direct `set`, `update`, `remove`, `spawn`, and `destroy`
calls are not middleware executions.

## Considered options

- Controlling around middleware was rejected because short-circuiting,
  replacing results, retrying systems, or swallowing errors would weaken the
  current guarantees that systems are explicit synchronous state transitions and
  failures do not roll changes back.
- Read-only completion hooks were rejected because they cannot bracket nested
  execution, measure the whole system duration, or observe failures with the
  same ordering as an around chain.
- Async middleware was rejected because the core does not schedule async
  systems. Side effects, retries, and HTTP calls belong in application adapters
  that call synchronous systems at their boundaries.

## Consequences

- Middleware is useful for tracing, timing, diagnostics, and invariant checks.
- Middleware is not a domain reaction system, scheduler, authorization layer,
  feature-flag source, Query invalidation hook, transaction, or rollback
  mechanism.
- Function identity is stable in-process, but `Function.name` is diagnostic
  only and may change after bundling or minification.
- Tracing middleware should avoid logging raw input by default because system
  input can contain sensitive application data.
