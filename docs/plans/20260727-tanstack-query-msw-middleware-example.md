# TanStack Query, MSW, and System Middleware Example

## Overview

- Add an opt-in synchronous observing middleware chain around `World.run`.
- Add a runnable `examples/invoice-approval` React application organized as vertical slices.
- Use TanStack Query as the owner of remote invoice data and cache state.
- Reconcile successful query snapshots into an ECS working set without overwriting transient approval state.
- Use MSW in the browser to provide delayed list loading, successful approval, and rejected approval responses without a real backend.
- Demonstrate a session-fixed approval feature flag and experiment variant at the application composition root.
- Preserve the existing ECSplain guarantees: systems remain synchronous, nested runs share one notification batch, and failures do not roll changes back.

Completion requires all of the following:

- `createWorld` accepts observing middleware without changing existing call sites.
- Middleware observes outer and nested systems in deterministic order, receives depth and input, and cannot skip execution or replace input, result, or error.
- The invoice example visibly demonstrates initial loading, cached data during background refresh, local optimistic approval state, successful server reconciliation, and server rejection.
- The default approval variant submits immediately; `?variant=review` requires explicit confirmation; `?approval=off` produces a read-only workspace.
- TanStack Query is the only owner of HTTP cache state, while ECS owns invoice entities, local workflow state, feature configuration, and server-snapshot projections used by systems.
- MSW handlers are reused by the browser example and Vitest integration tests.
- Unit, type, integration, build, and Playwright E2E checks pass.

## Context

### Existing files and APIs

- `src/world.ts`
  - Defines `System<Input, Output>`, `World`, `WorldState.run`, and `createWorld()`.
  - `WorldState.run` currently invokes a system directly, batches nested runs with `#batchDepth`, flushes subscribers only after the outer run, preserves already-applied changes on failure, and rethrows the original system error.
- `src/index.ts`
  - Exports the public core API and must export all new middleware option and context types.
- `tests/world.test.ts`
  - Covers nested batching, thrown values including `undefined`, subscriber errors, and retained changes after system failure.
- `tests/public-types.ts`
  - Compile-time contract test for the published TypeScript API.
- `examples/table`
  - Demonstrates nested `world.run` composition and ECS-owned records.
- `examples/dynamic-form`
  - Demonstrates bootstrap outside React and thin event handlers.
- `vite.config.ts`
  - Aliases `ecsplain` and `ecsplain/react` to local source for every example.
- `playwright.config.ts`
  - Starts the table and form examples on ports 4173 and 4174.
- `vitest.config.ts`
  - Includes `tests/**/*.{test,spec}.{ts,tsx}` and provides local package aliases.
- `knip.json`
  - Already treats `examples/*/src/main.tsx` as entry points.
- `biome.json`
  - Checks the complete repository and needs a force-ignore for MSW's generated service-worker script.
- `README.md` and `docs/tutorial.md`
  - Document the current core API, deliberate limits, and two runnable examples.
- `docs/adr`
  - Contains accepted decisions for immutable replacement, subscriptions, queries, and secondary indexes.

### Current repository state

- The working tree already contains user-owned modifications across the core, examples, tests, and documentation.
- Implementation must preserve those changes and apply only the edits named in this plan.
- The middleware implementation must be based on the current `src/world.ts`, including its query and secondary-index behavior, rather than the last committed version.

### Dependencies

- Add exact development dependencies:
  - `@tanstack/react-query@5.101.4`
  - `msw@2.15.0`
- Keep both packages out of `peerDependencies` and the published `dist`; only the new example and its tests import them.
- Generate `examples/invoice-approval/public/mockServiceWorker.js` with:

  ```sh
  npx msw init examples/invoice-approval/public --save
  ```

- The generated worker is committed but never edited or formatted manually.
- No credentials, environment variables, or external API are required.

### Project constraints

- Components contain passive data only.
- Systems are synchronous.
- Observable component changes replace values rather than mutate them in place.
- Batches are not transactions and provide no rollback.
- Business ordering stays explicit in entry systems and slice adapters.
- Feature rollout is separate from the `CanApprove` resource capability.
- Changes remain surgical and match the current TypeScript, Biome, Vitest, and Playwright conventions.

## Review Handoff

- Original request: plan a new TanStack Query example with MSW as a mock API server and add middleware to ECSplain immediately.
- Key decisions:
  - Use the invoice-approval enterprise workflow as the example.
  - Organize application code by vertical feature slice, not global `components` and `systems` folders.
  - Use one World for the invoice workspace.
  - TanStack Query owns remote fetching and cache state.
  - ECS stores a read-only server snapshot as a working-set projection plus local workflow state.
  - ECS is the sole owner of optimistic UI inside this workspace; the Query cache updates only after a successful mutation.
  - Resolve the approval flag and experiment variant once at bootstrap.
  - Add core observing around-middleware, not controlling middleware.
  - Middleware is synchronous, invokes `next()` exactly once, and cannot transform or suppress execution.
- Explicit non-goals:
  - Async middleware, automatic scheduling, retries around systems, rollback, or transactions.
  - Middleware-driven domain reactions, feature flags, authorization, HTTP calls, or Query invalidation.
  - Input/result rewriting, error swallowing, or short-circuiting.
  - A system registry or a new `defineSystem` API.
  - Stable system names across minified builds; function identity is stable in-process and `Function.name` is diagnostic only.
  - A global automatic `QueryCache → World` mirror.
  - TanStack Query persistence, SSR hydration, offline queues, pagination, or a production backend.
  - A remote feature-flag SDK or mid-session variant switching.
  - Updating or deploying `docs-site`; repository README, tutorial, ADR, and example README are sufficient for this change.
- Open questions: none.
- Hidden context: none; this plan is self-contained for a fresh executor.

## Development Approach

- Testing approach: TDD for the public middleware contract and ECS approval systems; integration tests before wiring the final UI.
- Complete each task fully before moving to the next.
- Make small, focused changes.
- Every code-change task includes new or updated tests.
- All tests for a task must pass before starting the next task.
- Update this plan if scope changes during implementation.
- Do not rely on chat history; decisions and constraints are recorded here.

## Testing Strategy

- Core unit tests verify middleware order, depth, result/error preservation, invalid `next` use, and unchanged batching.
- Public type tests verify `WorldOptions`, `SystemExecution`, and `SystemMiddleware`, including rejection of asynchronous or result-transforming middleware.
- Pure system tests verify direct and review variants, disabled approval, capability checks, optimistic state, stale mutation IDs, success, and failure.
- TanStack Query/MSW integration tests verify one cached initial request, background reconciliation, success/error handlers, and preservation of transient ECS components.
- Playwright tests verify the user-visible default, review, disabled, refresh, success, and failure flows against the browser service worker.
- Test Query clients use `retry: false` so failure assertions do not wait through retry backoff.
- Exact final commands:

  ```sh
  npm run check
  npm run typecheck
  npm test
  npm run build
  npm run build:examples
  npm run knip
  npm run test:e2e
  ```

## Progress Tracking

- Mark completed items with `[x]` immediately when done.
- Add newly discovered tasks with a `+` prefix.
- Document blockers with a `BLOCKED:` prefix.
- Keep this plan synchronized with implementation.

## What Goes Where

- Core middleware types and execution semantics belong in `src/world.ts`.
- Public middleware exports belong in `src/index.ts`.
- Remote DTOs, query options, reconciliation, approval systems, mutation integration, and UI remain inside their owning example slice.
- MSW handlers and mutable mock-server data remain under `examples/invoice-approval/src/mocks`.
- Cross-cutting trace middleware remains under `examples/invoice-approval/src/instrumentation`.
- Generated service-worker code remains under `examples/invoice-approval/public`.
- Repository scripts and E2E server configuration remain at the root.
- Manual and external follow-up belongs in Post-Completion, without checkboxes.

## Implementation Steps

### Task 1: Specify and implement observing system middleware

**Why:** The middleware contract changes the public execution boundary and must preserve existing batching and failure guarantees.

**Files:**

- Modify: `src/world.ts`
- Modify: `src/index.ts`
- Modify: `tests/world.test.ts`
- Modify: `tests/public-types.ts`

- [ ] Add failing tests in `tests/world.test.ts` for middleware registration through `createWorld({ middleware })`.
- [ ] Add failing tests proving middleware array order is first-registered/outermost and every nested `world.run` traverses the complete chain.
- [ ] Define execution depth as zero-based: an application entry system has `depth: 0`, and its directly nested system has `depth: 1`.
- [ ] Add failing tests that the execution context exposes the exact system function reference and the unchanged input value.
- [ ] Add failing tests that system return values, thrown `Error` instances, and thrown `undefined` cross the middleware chain unchanged.
- [ ] Add failing tests for middleware that returns normally without `next()`, invokes `next()` twice, returns a value not `Object.is`-equal to the `next()` result, or swallows/replaces an error thrown by `next()`.
- [ ] Add a test that middleware throwing before `next()` prevents the system from running and propagates that middleware error.
- [ ] Add a test that middleware throwing after a successful `next()` preserves system writes, flushes subscribers once, and then propagates the middleware error.
- [ ] Keep subscriber notification outside the system middleware boundary; document through a focused test that middleware completion occurs before the outer batch flush.
- [ ] Add `SystemExecution` with readonly `system`, `input`, and zero-based `depth`.
- [ ] Add a generic `SystemMiddleware` call signature whose `next` and return value share the same `Output` type.
- [ ] Add `WorldOptions` with an optional readonly middleware array and change `createWorld()` to `createWorld(options?: WorldOptions)` without breaking no-argument callers.
- [ ] Snapshot the supplied middleware array when creating the World so later mutation of the caller's array cannot change execution.
- [ ] Implement one synchronous middleware dispatcher used by every `World.run`; do not route direct `set`, `update`, `remove`, `spawn`, or `destroy` calls through middleware.
- [ ] Enforce exactly-one `next()` and unchanged result/error at runtime while preserving the original thrown value, including `undefined`.
- [ ] Preserve the current outer batch flush and error-priority behavior.
- [ ] Export `SystemExecution`, `SystemMiddleware`, and `WorldOptions` from `src/index.ts`.
- [ ] Add compile-time examples in `tests/public-types.ts` for valid middleware and `createWorld` options.
- [ ] Add `@ts-expect-error` coverage for asynchronous middleware and a middleware returning a fixed replacement value.
- [ ] Run `npx vitest run tests/world.test.ts` and `npm run typecheck`.

### Task 2: Add dependencies, scripts, and the invoice example shell

**Why:** The new standalone example needs reproducible package versions, its own Vite entry point, an MSW worker, build commands, and an E2E server.

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `playwright.config.ts`
- Modify: `biome.json`
- Create: `examples/invoice-approval/index.html`
- Create: `examples/invoice-approval/public/mockServiceWorker.js`
- Create: `examples/invoice-approval/src/main.tsx`
- Create: `examples/invoice-approval/src/styles.css`

- [ ] Install exact dev dependencies with `npm install --save-dev @tanstack/react-query@5.101.4 msw@2.15.0`.
- [ ] Add `dev:invoice` using `vite examples/invoice-approval --config vite.config.ts`.
- [ ] Add `build:invoice` using `vite build examples/invoice-approval --config vite.config.ts`.
- [ ] Include `build:invoice` in `build:examples`.
- [ ] Add a third Playwright `webServer` entry on `127.0.0.1:4175` with `--strictPort`.
- [ ] Generate the MSW worker with `npx msw init examples/invoice-approval/public --save`; retain the generated file unchanged.
- [ ] Preserve the worker directory recorded by MSW in `package.json`.
- [ ] Add `"**"` and the force-ignore pattern `"!!examples/invoice-approval/public/mockServiceWorker.js"` to `biome.json` `files.includes` so generated code is not formatted or linted.
- [ ] Create an accessible HTML root and minimal React entry point that can await MSW startup before rendering.
- [ ] Keep `QueryClient`, World, and the query bridge outside React `StrictMode` so StrictMode cannot recreate them.
- [ ] Run `npm run build:invoice`, `npm run check`, and `npm run typecheck`.

### Task 3: Build the ECS invoice working set and approval workflow

**Why:** Query data must become a system-readable ECS projection while approval state, capability checks, feature configuration, and optimistic UI remain explicit components.

**Files:**

- Create: `examples/invoice-approval/src/features/invoice-workspace/api.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/model.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/systems.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/index.ts`
- Create: `examples/invoice-approval/src/features/invoice-approval/model.ts`
- Create: `examples/invoice-approval/src/features/invoice-approval/systems.ts`
- Create: `examples/invoice-approval/src/features/invoice-approval/index.ts`
- Create: `tests/invoice-approval-systems.test.ts`

- [ ] Define the server contract `InvoiceDto` with `id`, `number`, `vendor`, `amountCents`, `status`, `version`, and `canApprove`, plus `InvoiceListResponse` with `items`.
- [ ] Define workspace-owned `InvoiceId`, immutable `InvoiceSnapshot`, `CanApprove`, and a reusable query for renderable invoice entities.
- [ ] Create a unique secondary index for `InvoiceId` during bootstrap and use it for all server-to-entity reconciliation.
- [ ] Implement `reconcileInvoices` to spawn or update server projections and add/remove `CanApprove` from the latest DTO.
- [ ] Ensure reconciliation never removes `ApprovalReview`, `PendingApproval`, or `ApprovalError`.
- [ ] Do not destroy an entity merely because it is absent from one list response; deletion lifecycle is outside this example.
- [ ] Define approval-owned `ApprovalEnabled`, `ApprovalVariant`, `ApprovalReview`, `PendingApproval`, and `ApprovalError`.
- [ ] Store `ApprovalEnabled` and `ApprovalVariant` on the stable workspace entity; use variants `"direct"` and `"review"`.
- [ ] Implement `requestInvoiceApproval`: validate the feature flag, resource capability, current server status, and absence of a pending mutation; start `PendingApproval` for the direct variant or add `ApprovalReview` for the review variant.
- [ ] Implement `confirmInvoiceApproval` and `cancelInvoiceApproval` for the review variant.
- [ ] Pass `mutationId` into systems from the adapter; do not generate randomness inside a system.
- [ ] Implement `confirmInvoiceApprovalMutation` to ignore stale mutation IDs, replace `InvoiceSnapshot` with the returned server DTO, synchronize `CanApprove`, clear pending/review/error state, and leave Query cache work to the adapter.
- [ ] Implement `rejectInvoiceApprovalMutation` to ignore stale mutation IDs, clear pending state, preserve the prior server snapshot, and attach a visible error.
- [ ] Keep shared mechanical logic as local helper functions rather than creating single-use systems.
- [ ] Write system tests first for direct approval, review/confirm/cancel, disabled feature, missing capability, already-approved invoices, duplicate pending requests, stale success, stale failure, successful reconciliation, and rejected reconciliation.
- [ ] Ensure tests explain the invariant being protected, especially why refetch cannot erase pending workflow state.
- [ ] Run `npx vitest run tests/invoice-approval-systems.test.ts` and `npm run typecheck`.

### Task 4: Integrate TanStack Query and MSW through a scoped slice adapter

**Why:** The example must demonstrate a real remote-cache boundary without introducing hidden Query behavior into middleware or ECS systems.

**Files:**

- Create: `examples/invoice-approval/src/features/invoice-workspace/queries.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/query-bridge.ts`
- Create: `examples/invoice-approval/src/features/invoice-approval/mutation.ts`
- Create: `examples/invoice-approval/src/mocks/data.ts`
- Create: `examples/invoice-approval/src/mocks/handlers.ts`
- Create: `examples/invoice-approval/src/mocks/browser.ts`
- Create: `tests/invoice-query-bridge.test.ts`

- [ ] Define the query key as `["invoices"]` and export typed `queryOptions` with `staleTime: 30_000` and `retry: false`.
- [ ] Fetch `GET /api/invoices`, reject non-2xx responses, and keep DTO parsing in the workspace API module.
- [ ] Implement `startInvoiceQueryBridge` with a query-specific `QueryObserver`, not a subscription to the entire `QueryCache`.
- [ ] Reconcile only successful results and track `dataUpdatedAt` so the same cache result is not applied repeatedly.
- [ ] Return an unsubscribe function from the bridge and dispose it on page teardown.
- [ ] Keep the UI's `useQuery` observer and the bridge on the same query options so TanStack Query deduplicates the HTTP request.
- [ ] Implement `POST /api/invoices/:invoiceId/approve` in the approval mutation adapter.
- [ ] Generate `mutationId` before calling ECS entry systems and send the returned command to TanStack `useMutation`.
- [ ] On success, run ECS confirmation first, immutably update the matching DTO with `queryClient.setQueryData`, and then invalidate `["invoices"]` for background verification.
- [ ] On error, run ECS rejection and invalidate the query without applying an optimistic Query-cache update.
- [ ] Ensure ECS alone renders the workspace's optimistic approval state; never implement a second optimistic value or rollback in Query cache.
- [ ] Implement a fresh in-memory mock invoice store factory so browser and test handlers do not leak mutable state across runs.
- [ ] Add delayed MSW handlers for:
  - `GET /api/invoices`, returning three stable invoices.
  - Successful approval of the first pending invoice, incrementing its version and removing approval capability.
  - HTTP 409 rejection of the second pending invoice with a typed error message.
  - An already-approved third invoice without approval capability.
- [ ] Use `http`, `HttpResponse`, and `delay` from MSW 2 and reuse the same handler factory with `setupWorker` and `setupServer`.
- [ ] Start the browser worker before rendering and set `onUnhandledRequest: "error"`.
- [ ] Write integration tests proving the bridge loads one cached result, a background invalidation replaces `InvoiceSnapshot`, transient ECS state survives reconciliation, successful mutation updates both stores after confirmation, and rejected mutation leaves the server snapshot intact.
- [ ] Start and close `setupServer` in the test lifecycle and reset handlers/store state between tests.
- [ ] Run `npx vitest run tests/invoice-query-bridge.test.ts`, `npm run typecheck`, and `npm run build:invoice`.

### Task 5: Assemble the vertical slices and demonstrate tracing middleware

**Why:** The runnable screen must make the architectural boundaries and middleware behavior visible without moving domain effects into the middleware chain.

**Files:**

- Create: `examples/invoice-approval/src/app/config.ts`
- Create: `examples/invoice-approval/src/app/create-example.ts`
- Create: `examples/invoice-approval/src/app/App.tsx`
- Create: `examples/invoice-approval/src/features/invoice-workspace/InvoiceWorkspace.tsx`
- Create: `examples/invoice-approval/src/features/invoice-approval/InvoiceApprovalControls.tsx`
- Create: `examples/invoice-approval/src/instrumentation/tracing-middleware.ts`
- Modify: `examples/invoice-approval/src/main.tsx`
- Modify: `examples/invoice-approval/src/styles.css`

- [ ] Parse session-fixed configuration before World creation:
  - Default: approval enabled with `"direct"` variant.
  - `?variant=review`: approval enabled with `"review"` variant.
  - `?approval=off`: approval disabled and workspace read-only.
- [ ] Create the workspace entity and attach feature configuration in `create-example.ts`; no slice reads URL globals directly.
- [ ] Create one QueryClient, one World, one unique `InvoiceId` index, one query bridge, and a disposal function.
- [ ] Add a tracing middleware that records function name, zero-based depth, elapsed duration, and success/error outcome through `console.info`.
- [ ] Never log middleware input because it may contain invoice data or other sensitive values.
- [ ] Use `try/catch/finally` only to observe and rethrow the exact original error; return the exact `next()` result.
- [ ] Render Query-owned initial loading, error, and background-refresh status.
- [ ] Continue rendering cached ECS invoices while a background refresh is active.
- [ ] Add a manual refresh control that calls `queryClient.invalidateQueries({ queryKey: ["invoices"] })`.
- [ ] Render ECS-owned server snapshots, approval capability, review prompt, pending indicator, and approval error per entity.
- [ ] In the direct variant, start the mutation from the first approval action.
- [ ] In the review variant, require a second explicit confirmation and provide cancel.
- [ ] In the disabled variant, render no approval actions and explain that rollout configuration disabled the feature.
- [ ] Keep React handlers thin: translate interaction into ECS system input and pass returned commands to the mutation adapter.
- [ ] Provide accessible headings, buttons, status messages, alerts, and stable test IDs only where role/name queries are insufficient.
- [ ] Run `npm run build:invoice`, `npm run check`, and `npm run typecheck`.

### Task 6: Add browser-level acceptance coverage

**Why:** Service-worker interception, Query caching, React subscriptions, and ECS workflow composition must be verified together in a real browser.

**Files:**

- Create: `e2e/invoice-approval.spec.ts`
- Modify: `playwright.config.ts`

- [ ] Verify initial loading resolves into the three MSW-backed invoices.
- [ ] Verify manual refresh shows background activity while cached invoice rows remain visible.
- [ ] Verify successful direct approval immediately shows ECS pending state, then renders the approved server response and removes the approval action.
- [ ] Verify the HTTP 409 invoice clears pending state, keeps its prior snapshot, and renders the server error as an alert.
- [ ] Open `?variant=review` and verify the first action only opens ECS review state, cancel restores idle state, and confirmation starts the mutation.
- [ ] Open `?approval=off` and verify the same server data loads while approval controls remain absent.
- [ ] Capture browser console output and assert at least one outer and one nested named system trace with the expected depth prefix; do not assert timing values.
- [ ] Run `npx playwright test e2e/invoice-approval.spec.ts`.

### Task 7: Document the public contract and runnable architecture

**Why:** Middleware semantics and the two-store boundary are easy to misuse unless their constraints are explicit.

**Files:**

- Create: `docs/adr/0003-synchronous-observing-system-middleware.md`
- Create: `examples/invoice-approval/README.md`
- Modify: `README.md`
- Modify: `docs/tutorial.md`

- [ ] Record in ADR 0003 why observing middleware was selected over controlling middleware and read-only completion hooks.
- [ ] Document zero-based depth, array order, nested execution, exactly-once `next`, unchanged result/error, synchronous execution, and the fact that subscriber notification is outside the system middleware boundary.
- [ ] Warn that `Function.name` is diagnostic only and middleware should not log raw input by default.
- [ ] Add `dev:invoice` to the root example commands and describe the third runnable example.
- [ ] Explain the vertical-slice structure and dependency direction in the example README.
- [ ] Explain the Query/ECS ownership table, QueryObserver bridge, optimistic ownership rule, MSW endpoints, refresh behavior, feature URL parameters, and tracing middleware.
- [ ] Extend the async-data portion of `docs/tutorial.md` with a concise link to the runnable invoice example instead of duplicating its entire README.
- [ ] Update the deliberate limits to state that middleware observes explicitly-run systems and does not introduce scheduling, async systems, side-effect orchestration, or rollback.
- [ ] Run `npm run check` and manually verify every new relative documentation link.

### Task 8: Verify all acceptance criteria

- [ ] Verify existing `createWorld()` callers compile and behave unchanged.
- [ ] Verify every middleware contract rule has a unit or public-type test.
- [ ] Verify the example uses no Query or MSW imports from `src`.
- [ ] Verify one successful fetch cannot create duplicate ECS entities for the same `InvoiceId`.
- [ ] Verify background query reconciliation cannot remove review, pending, or error components.
- [ ] Verify only one store owns optimistic state.
- [ ] Verify browser MSW starts before the first API request and rejects unhandled requests.
- [ ] Run `npm run check`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run build:examples`.
- [ ] Run `npm run knip`.
- [ ] Run `npm run test:e2e`.

### Task 9: Final documentation state

- [ ] Update this plan with any scope changes discovered during implementation.
- [ ] Mark every completed task immediately after its validation command passes.
- [ ] Move this file to `docs/plans/completed/20260727-tanstack-query-msw-middleware-example.md` only after all acceptance criteria pass.

## Technical Details

### Public middleware contract

The implementation should expose these concepts from `ecsplain`:

```ts
interface SystemExecution {
	readonly system: System<never, unknown>
	readonly input: unknown
	readonly depth: number
}

interface SystemMiddleware {
	<Output>(execution: SystemExecution, next: () => Output): Output
}

interface WorldOptions {
	readonly middleware?: readonly SystemMiddleware[]
}

function createWorld(options?: WorldOptions): World
```

The exact use of an alias for `System<never, unknown>` may change if TypeScript variance requires it, but the public context must expose a non-callable system identity without `any`.

Middleware invariants:

- Registration order is outermost-first.
- Every explicit `world.run` passes through middleware.
- Direct mutations do not pass through middleware.
- Depth counts nested `world.run` calls, not middleware chain position.
- `next()` is synchronous and exactly once.
- The middleware returns the exact value returned by `next()`.
- The middleware cannot swallow or replace a value thrown by `next()`.
- Middleware code that fails before `next()` prevents the system from running.
- Middleware code that fails after a successful `next()` follows existing no-rollback semantics.
- The outer run flushes pending subscriber notifications after the middleware chain completes.

### Vertical slice dependency direction

```text
app
  ├─ invoice-workspace
  ├─ invoice-approval ──> invoice-workspace public API
  ├─ instrumentation
  └─ mocks

invoice-workspace ──> TanStack Query + fetch
invoice-approval ──> TanStack mutation adapter + ECS entry systems
mocks ──> shared InvoiceDto type only
src/ecsplain ──> no example dependency
```

`invoice-workspace` owns remote projections and stable invoice identities. `invoice-approval` consumes that public read model and owns approval workflow components. The application composition root is the only place that combines configuration, World, QueryClient, bridge, middleware, and providers.

### Server and cache flow

```text
QueryObserver
  → GET /api/invoices
  → TanStack Query cache
  → reconcileInvoices
  → InvoiceId + InvoiceSnapshot + CanApprove

Approve click
  → ECS request/confirm system
  → PendingApproval
  → useMutation command
  → POST /api/invoices/:id/approve
    success:
      → ECS confirm with returned DTO
      → immutable Query setQueryData
      → Query invalidation/background verification
    error:
      → ECS reject
      → Query invalidation
```

There is no atomic transaction across QueryClient and World. The screen avoids split-brain rendering by using ECS as its invoice working set and optimistic owner; Query cache becomes visible to this World only through explicit reconciliation.

### Feature rollout and capability

- `ApprovalEnabled` is workspace rollout configuration.
- `ApprovalVariant` is the stable `"direct"` or `"review"` session assignment.
- `CanApprove` is a resource capability derived from server data.
- Approval systems guard all three relevant conditions; hiding a button is not the only enforcement.
- The mock server independently validates approval and can still reject a locally permitted action.

### Mock server behavior

- The browser uses `setupWorker`.
- Vitest integration tests use `setupServer`.
- Both receive handlers from the same factory and a fresh mutable mock store.
- Delays are long enough for Playwright to observe pending/loading states but remain below normal test timeouts.
- The generated `mockServiceWorker.js` is an opaque MSW artifact.

## Post-Completion

**Manual verification:**

- Open `http://127.0.0.1:4175` and inspect Network to confirm requests are intercepted by the service worker.
- Confirm refresh retains visible cached rows while showing background activity.
- Confirm tracing logs contain no DTO or mutation input values.
- Open `?variant=review` and `?approval=off` to inspect the two non-default configurations.

**External system updates:**

- None. The example has no production API, credentials, remote flag service, or deployment requirement.
