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
- Server `version` values are monotonic per invoice; neither an older GET nor an older mutation response can regress the Query cache or ECS projection.
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
  - Allow at most one in-flight approval per invoice and do not add mutation IDs; freshness is enforced by the server `version`.
  - Cancel active invoice queries before approval POST requests, pass TanStack Query's abort signal to `fetch`, and reconcile only newer server versions.
  - Construct API URLs from an explicit base URL so the same client works in the browser and Node-based Vitest.
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

- Testing approach: TDD for each middleware, ECS, adapter, and UI behavior; write the focused failing test before the implementation checklist in every code-change task.
- Task 2 is infrastructure-only: its generated worker, scripts, and empty example shell are verified by repository checks, typechecking, and a production example build before behavioral code is added.
- Complete each task fully before moving to the next.
- Make small, focused changes.
- Every code-change task includes new or updated tests.
- All tests for a task must pass before starting the next task.
- Update this plan if scope changes during implementation.
- Do not rely on chat history; decisions and constraints are recorded here.

## Testing Strategy

- Core unit tests verify middleware order, depth, result/error preservation, invalid `next` use, and unchanged batching.
- Public type tests verify `WorldOptions`, `SystemExecution`, and `SystemMiddleware`, including rejection of asynchronous or result-transforming middleware.
- Pure system tests verify monotonic version reconciliation, direct and review variants, disabled approval, capability checks, optimistic state, duplicate-request prevention, success, and failure.
- TanStack Query/MSW integration tests verify one actual initial GET for multiple observers, explicit Node-safe URLs, background reconciliation, aborted stale GET responses, typed success/error handling, same-tick cache writes, and preservation of transient ECS components.
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

- [x] Add failing tests in `tests/world.test.ts` for middleware registration through `createWorld({ middleware })`.
- [x] Add failing tests proving middleware array order is first-registered/outermost and every nested `world.run` traverses the complete chain.
- [x] Add failing tests proving the middleware array is snapshotted and direct `set`, `update`, `remove`, `spawn`, and `destroy` calls bypass the chain.
- [x] Define execution depth as zero-based: an application entry system has `depth: 0`, and its directly nested system has `depth: 1`.
- [x] Add failing tests that the execution context exposes the exact system function reference and the unchanged input value.
- [x] Add failing tests that system return values, thrown `Error` instances, and thrown `undefined` cross the middleware chain unchanged.
- [x] Add failing tests for middleware that returns normally without `next()`, invokes `next()` twice, returns a value not `Object.is`-equal to the `next()` result, or swallows/replaces an error thrown by `next()`.
- [x] Add a test that middleware throwing before `next()` prevents the system from running and propagates that middleware error.
- [x] Add a test that middleware throwing after a successful `next()` preserves system writes, flushes subscribers once, and then propagates the middleware error.
- [x] Add tests for competing system or middleware and subscriber failures, preserving the current primary-error priority.
- [x] Add a test that a failed nested run restores execution depth before the next top-level run.
- [x] Keep subscriber notification outside the system middleware boundary; document through a focused test that middleware completion occurs before the outer batch flush.
- [x] Add `SystemExecution` with readonly `system`, `input`, and zero-based `depth`.
- [x] Add a generic `SystemMiddleware` call signature whose `next` and return value share the same `Output` type.
- [x] Add `WorldOptions` with an optional readonly middleware array and change `createWorld()` to `createWorld(options?: WorldOptions)` without breaking no-argument callers.
- [x] Snapshot the supplied middleware array when creating the World so later mutation of the caller's array cannot change execution.
- [x] Implement one synchronous middleware dispatcher used by every `World.run`; do not route direct `set`, `update`, `remove`, `spawn`, or `destroy` calls through middleware.
- [x] Enforce exactly-one `next()` and unchanged result/error at runtime while preserving the original thrown value, including `undefined`.
- [x] Preserve the current outer batch flush and error-priority behavior.
- [x] Export `SystemExecution`, `SystemMiddleware`, and `WorldOptions` from `src/index.ts`.
- [x] Add compile-time examples in `tests/public-types.ts` for valid middleware and `createWorld` options.
- [x] Add `@ts-expect-error` coverage for asynchronous middleware and a middleware returning a fixed replacement value.
- [x] Run `npx vitest run tests/world.test.ts` and `npm run typecheck`.

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

- [x] Install exact dev dependencies with `npm install --save-dev --save-exact @tanstack/react-query@5.101.4 msw@2.15.0`.
- [x] Add `dev:invoice` using `vite examples/invoice-approval --config vite.config.ts`.
- [x] Add `build:invoice` using `vite build examples/invoice-approval --config vite.config.ts`.
- [x] Include `build:invoice` in `build:examples`.
- [x] Add a third Playwright `webServer` entry on `127.0.0.1:4175` with `--strictPort`.
- [x] Generate the MSW worker with `npx msw init examples/invoice-approval/public --save`; retain the generated file unchanged.
- [x] Preserve the worker directory recorded by MSW in `package.json`.
- [x] Add `"**"` and the force-ignore pattern `"!!examples/invoice-approval/public/mockServiceWorker.js"` to `biome.json` `files.includes` so generated code is not formatted or linted.
- [x] Create an accessible HTML root and minimal React entry point that can await MSW startup before rendering.
- [x] Run `npm run build:invoice`, `npm run check`, and `npm run typecheck`.

### Task 3: Build monotonic ECS invoice reconciliation

**Why:** Query data must become a system-readable ECS projection without allowing delayed server snapshots to regress newer invoice state or erase transient workflow components.

**Files:**

- Create: `examples/invoice-approval/src/features/invoice-workspace/api.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/model.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/systems.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/index.ts`
- Create: `tests/invoice-reconciliation.test.ts`

- [x] Write failing tests first for initial spawn, update by `InvoiceId`, capability synchronization, duplicate prevention, absent-list-item preservation, and unrelated-component preservation.
- [x] Add failing tests proving a lower or equal `version` cannot replace an existing snapshot or its `CanApprove` capability, while a higher `version` updates both together.
- [x] Define the server contract `InvoiceDto` with `id`, `number`, `vendor`, `amountCents`, `status`, `version`, and `canApprove`, plus `InvoiceListResponse` with `items`.
- [x] Document in the contract that `version` increases for every server-visible change to an invoice.
- [x] Define workspace-owned `InvoiceId`, immutable `InvoiceSnapshot`, `CanApprove`, and a reusable query for renderable invoice entities.
- [x] Create a unique secondary index for `InvoiceId` during bootstrap and use it for all server-to-entity reconciliation.
- [x] Implement public `applyInvoiceSnapshot` to spawn a missing entity, apply an incoming DTO to an existing entity only when its `version` is greater than the stored `InvoiceSnapshot.version`, and return whether it applied the DTO.
- [x] Implement `reconcileInvoices` as an explicit entry system that runs `applyInvoiceSnapshot` for each DTO; this is the example's natural nested-system composition for one remote list event.
- [x] Update `InvoiceSnapshot` and `CanApprove` as one synchronous system operation for an accepted version.
- [x] Limit reconciliation to workspace-owned snapshot and capability components so unrelated components remain untouched.
- [x] Do not destroy an entity merely because it is absent from one list response; deletion lifecycle is outside this example.
- [x] Run `npx vitest run tests/invoice-reconciliation.test.ts` and `npm run typecheck`.

### Task 4: Build the ECS approval workflow

**Why:** Feature rollout, experiment behavior, capability checks, and optimistic UI must remain explicit business state rather than leaking into React or TanStack Query.

**Files:**

- Create: `examples/invoice-approval/src/features/invoice-approval/model.ts`
- Create: `examples/invoice-approval/src/features/invoice-approval/systems.ts`
- Create: `examples/invoice-approval/src/features/invoice-approval/index.ts`
- Create: `tests/invoice-approval-systems.test.ts`

- [x] Write failing tests first for direct approval, review/confirm/cancel, disabled rollout, missing capability, already-approved invoices, and rejection of a duplicate request while the invoice is pending.
- [x] Add failing tests proving approval success clears transient state, delegates to the workspace snapshot system, returns whether the snapshot was applied, and never regresses a newer snapshot.
- [x] Add a focused test proving list reconciliation cannot remove `ApprovalReview`, `PendingApproval`, or `ApprovalError`.
- [x] Add failing tests proving approval failure clears pending state, preserves the last accepted server snapshot, and attaches the normalized server message.
- [x] Define approval-owned `ApprovalEnabled`, `ApprovalVariant`, `ApprovalReview`, `PendingApproval`, and `ApprovalError`.
- [x] Store `ApprovalEnabled` and `ApprovalVariant` on the stable workspace entity; use variants `"direct"` and `"review"`.
- [x] Implement `requestInvoiceApproval`: validate rollout, capability, current server status, and absence of `PendingApproval`; add pending state and return an approval command for `"direct"`, or add review state for `"review"`.
- [x] Implement `confirmInvoiceApprovalReview` and `cancelInvoiceApprovalReview`; confirmation adds pending state and returns the same approval command shape used by the direct path.
- [x] Do not introduce a mutation ID: `PendingApproval` prevents a second in-flight request for the same invoice.
- [x] Implement `applyInvoiceApprovalSuccess` to validate the returned invoice ID, run workspace-owned `applyInvoiceSnapshot`, clear pending/review/error state, and return `{ applied: boolean }` to the remote adapter.
- [x] Implement `applyInvoiceApprovalFailure` to clear pending state, preserve the snapshot, and attach a visible error message.
- [x] Keep shared mechanical logic as local helper functions rather than creating single-use systems.
- [x] Ensure test names explain why background or mutation responses cannot regress accepted state.
- [x] Run `npx vitest run tests/invoice-approval-systems.test.ts` and `npm run typecheck`.

### Task 5: Add the Query/MSW list boundary and scoped bridge

**Why:** The list query needs one explicit, testable bridge into ECS that works in both browser and Node environments and remains safe under rapid cache updates.

**Files:**

- Modify: `examples/invoice-approval/src/features/invoice-workspace/api.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/queries.ts`
- Create: `examples/invoice-approval/src/features/invoice-workspace/query-bridge.ts`
- Create: `examples/invoice-approval/src/mocks/data.ts`
- Create: `examples/invoice-approval/src/mocks/handlers.ts`
- Create: `examples/invoice-approval/src/mocks/browser.ts`
- Create: `tests/invoice-query-bridge.test.ts`

- [ ] Write integration tests first with `setupServer`, an explicit `http://invoice.test/api/` base URL, a fresh store per test, and `retry: false`.
- [ ] Add failing tests proving two query-specific observers cause one actual GET, a newer cache result reaches ECS, transient ECS state survives, and two different `setQueryData` values applied in the same tick are both considered rather than deduplicated by timestamp.
- [ ] Define `createInvoiceApi(baseUrl: URL)` and build request URLs with `new URL(...)`; browser composition passes `new URL("/api/", window.location.origin)` and Vitest passes `new URL("http://invoice.test/api/")`.
- [ ] Define the query key as `["invoices"]` and export typed query options with `staleTime: 30_000` and `retry: false`.
- [ ] Pass the query function's TanStack Query `signal` into `fetch`, check `response.ok`, and parse the successful `InvoiceListResponse`.
- [ ] Implement `startInvoiceQueryBridge` with a query-specific `QueryObserver`, not a subscription to the entire `QueryCache`.
- [ ] Reconcile only successful results and compare the `data` reference with the last applied reference; do not use `dataUpdatedAt` as the deduplication identity.
- [ ] Rely on monotonic `reconcileInvoices` as the final idempotency and stale-version guard.
- [ ] Return an unsubscribe function from the bridge and dispose it on page teardown.
- [ ] Keep the UI observer and bridge on the exact same query options object so TanStack Query deduplicates their HTTP request.
- [ ] Implement a fresh in-memory mock invoice store factory so browser and tests do not leak mutable state across runs.
- [ ] Add an MSW `GET /api/invoices` handler returning three stable invoices after an explicit `150 ms` delay.
- [ ] Make the handler factory accept the API base URL and reuse it with `setupWorker` and `setupServer`; use `http`, `HttpResponse`, and `delay` from MSW 2.
- [ ] Start and close `setupServer` in the test lifecycle and reset handler/store state between tests.
- [ ] Run `npx vitest run tests/invoice-query-bridge.test.ts`, `npm run typecheck`, and `npm run build:invoice`.

### Task 6: Add the approval mutation adapter and race coverage

**Why:** The mutation path coordinates two stores without a transaction, so cancellation, version checks, and error mapping must be explicit and verified together.

**Files:**

- Create: `examples/invoice-approval/src/features/invoice-approval/api.ts`
- Create: `examples/invoice-approval/src/features/invoice-approval/mutation.ts`
- Modify: `examples/invoice-approval/src/features/invoice-approval/index.ts`
- Modify: `examples/invoice-approval/src/mocks/data.ts`
- Modify: `examples/invoice-approval/src/mocks/handlers.ts`
- Create: `tests/invoice-approval-mutation.test.ts`

- [ ] Write integration tests first for successful approval, HTTP 409 rejection, a stale successful DTO, and a GET started before approval that is aborted and cannot overwrite the POST result.
- [ ] Define `createInvoiceApprovalApi(baseUrl: URL)`, a typed `InvoiceApprovalErrorResponse` with `message`, and an `InvoiceApiError` carrying the HTTP status and normalized message in the approval slice.
- [ ] Implement the approval POST with the explicit API base URL, check `response.ok`, parse the success DTO, and throw `InvoiceApiError` for non-2xx responses including the MSW 409 body.
- [ ] Before starting POST, await `queryClient.cancelQueries({ queryKey: invoiceQueryKey })`; consuming the query signal in Task 5 must abort an older GET rather than merely ignoring its result.
- [ ] On success, run `applyInvoiceApprovalSuccess` first.
- [ ] Update Query cache only when the ECS system returns `applied: true`, and use an immutable version-aware merge that never replaces a cached invoice with a lower or equal version.
- [ ] Invalidate `["invoices"]` after every success for background verification, including a stale success that was not applied.
- [ ] On error, run `applyInvoiceApprovalFailure` with `InvoiceApiError.message` or the fallback `"Approval request failed"` for unknown/network errors, then invalidate the query without applying an optimistic Query-cache value.
- [ ] Ensure ECS alone owns and renders optimistic pending state; do not add Query-cache optimistic state or rollback.
- [ ] Extend the shared MSW factory with an approval handler delayed by exactly `250 ms`: approve the first pending invoice by incrementing its version and removing capability, return typed HTTP 409 for the second, and keep the third already approved.
- [ ] Assert UI state transitions or deferred request resolution in tests; do not assert elapsed milliseconds.
- [ ] Run `npx vitest run tests/invoice-approval-mutation.test.ts`, `npm run typecheck`, and `npm run build:invoice`.

### Task 7: Compose the application and tracing middleware

**Why:** Bootstrap is the only layer that should combine flags, World, QueryClient, the scoped bridge, remote adapters, middleware, MSW, and React providers.

**Files:**

- Create: `examples/invoice-approval/src/app/config.ts`
- Create: `examples/invoice-approval/src/app/create-example.ts`
- Create: `examples/invoice-approval/src/instrumentation/tracing-middleware.ts`
- Modify: `examples/invoice-approval/src/main.tsx`
- Create: `tests/invoice-example-bootstrap.test.ts`

- [ ] Write focused tests first for default, review, and disabled URL configuration plus tracing success/error behavior without logging middleware input.
- [ ] Parse session-fixed configuration before World creation:
  - Default: approval enabled with `"direct"` variant.
  - `?variant=review`: approval enabled with `"review"` variant.
  - `?approval=off`: approval disabled and workspace read-only.
- [ ] Create the workspace entity and attach feature configuration in `create-example.ts`; no feature slice reads URL globals directly.
- [ ] Create one QueryClient, one World, one unique `InvoiceId` index, one query-options object, one query bridge, and one disposal function.
- [ ] Pass the browser origin-derived API base URL to both slice API clients and the same base URL to the MSW handler factory.
- [ ] Start the browser worker with `onUnhandledRequest: "error"` before creating observers or rendering.
- [ ] Keep QueryClient, World, and the query bridge outside React `StrictMode` so StrictMode cannot recreate them.
- [ ] Dispose the query bridge and clear the QueryClient on page teardown.
- [ ] Add tracing middleware that records diagnostic function name, zero-based depth, elapsed duration, and success/error outcome through `console.info`.
- [ ] Never log middleware input because it may contain invoice data or other sensitive values.
- [ ] Return the exact `next()` result and rethrow the exact original error; nested-depth behavior remains a core unit-test contract rather than an application composition requirement.
- [ ] Run `npx vitest run tests/invoice-example-bootstrap.test.ts`, `npm run typecheck`, and `npm run build:invoice`.

### Task 8: Build the UI and browser acceptance coverage

**Why:** The final screen must demonstrate the vertical-slice boundaries and verify browser service-worker, cache, React, and ECS behavior together.

**Files:**

- Create: `examples/invoice-approval/src/app/App.tsx`
- Create: `examples/invoice-approval/src/features/invoice-workspace/InvoiceWorkspace.tsx`
- Create: `examples/invoice-approval/src/features/invoice-approval/InvoiceApprovalControls.tsx`
- Modify: `examples/invoice-approval/src/styles.css`
- Create: `e2e/invoice-approval.spec.ts`

- [ ] Write the Playwright scenarios first against the acceptance behavior below, then implement the UI until they pass.
- [ ] Render Query-owned initial loading, error, and background-refresh status while keeping cached ECS rows visible during refresh.
- [ ] Add a manual refresh control that calls `queryClient.invalidateQueries({ queryKey: invoiceQueryKey })`.
- [ ] Render ECS-owned server snapshots, approval capability, review prompt, pending indicator, and approval error per entity.
- [ ] In the direct variant, pass the command returned by the first ECS approval action to the mutation adapter.
- [ ] In the review variant, require explicit confirmation, support cancel, and pass only the confirmation command to the mutation adapter.
- [ ] In the disabled variant, render no approval actions and explain that rollout configuration disabled the feature.
- [ ] Keep React handlers thin: translate interaction into ECS system input and pass returned commands to the adapter.
- [ ] Provide accessible headings, buttons, status messages, alerts, and stable test IDs only where role/name queries are insufficient.
- [ ] Verify initial loading resolves into the three MSW-backed invoices.
- [ ] Verify manual refresh shows background activity while cached invoice rows remain visible.
- [ ] Verify successful direct approval immediately shows ECS pending state, then renders the approved server response and removes the approval action.
- [ ] Verify HTTP 409 clears pending state, keeps the prior snapshot, and renders the server message as an alert.
- [ ] Verify `?variant=review` opens review state first, cancel restores idle state, and confirmation starts mutation.
- [ ] Verify `?approval=off` loads the same server data with no approval controls.
- [ ] Capture browser console output and assert a real approval entry system emits a successful trace with `depth: 0`; do not require artificial nesting or assert timing values.
- [ ] Run `npm run build:invoice`, `npm run check`, `npm run typecheck`, and `npx playwright test e2e/invoice-approval.spec.ts`.

### Task 9: Document the public contract and runnable architecture

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
- [ ] Explain the Query/ECS ownership table, QueryObserver bridge, monotonic-version and query-cancellation rules, typed API errors, optimistic ownership rule, MSW endpoints, refresh behavior, feature URL parameters, and tracing middleware.
- [ ] Extend the async-data portion of `docs/tutorial.md` with a concise link to the runnable invoice example instead of duplicating its entire README.
- [ ] Update the deliberate limits to state that middleware observes explicitly-run systems and does not introduce scheduling, async systems, side-effect orchestration, or rollback.
- [ ] Run `npm run check` and manually verify every new relative documentation link.

### Task 10: Verify all acceptance criteria

- [ ] Verify existing `createWorld()` callers compile and behave unchanged.
- [ ] Verify every middleware contract rule has a unit or public-type test.
- [ ] Verify the example uses no Query or MSW imports from `src`.
- [ ] Verify one successful fetch cannot create duplicate ECS entities for the same `InvoiceId`.
- [ ] Verify background query reconciliation cannot remove review, pending, or error components.
- [ ] Verify delayed GET and mutation responses cannot regress either Query cache or ECS below the highest accepted invoice version.
- [ ] Verify every non-2xx API response is checked before success callbacks and the HTTP 409 message reaches the UI.
- [ ] Verify only one store owns optimistic state.
- [ ] Verify browser MSW starts before the first API request and rejects unhandled requests.
- [ ] Run `npm run check`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm test`.
- [ ] Run `npm run build`.
- [ ] Run `npm run build:examples`.
- [ ] Run `npm run knip`.
- [ ] Run `npm run test:e2e`.

### Task 11: Final documentation state

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
  → GET /api/invoices with TanStack Query AbortSignal
  → TanStack Query cache
  → reconcileInvoices
  → nested applyInvoiceSnapshot
  → accept only a higher per-invoice version
  → InvoiceId + InvoiceSnapshot + CanApprove

Approve click
  → ECS request/confirm system
  → PendingApproval
  → useMutation command
  → cancel active ["invoices"] queries
  → POST /api/invoices/:id/approve
    success:
      → ECS applyInvoiceApprovalSuccess
      → nested applyInvoiceSnapshot
      → if applied, immutable version-aware Query setQueryData
      → Query invalidation/background verification
    error:
      → parse typed server error
      → ECS applyInvoiceApprovalFailure
      → Query invalidation
```

There is no atomic transaction across QueryClient and World. The screen avoids split-brain rendering by using ECS as its invoice working set and optimistic owner; Query cache becomes visible to this World only through explicit reconciliation. The mutation adapter always updates ECS first and uses the returned `applied` decision before touching Query cache.

### Freshness and concurrency invariants

- Server `version` is strictly monotonic per invoice and increases for every server-visible change.
- `applyInvoiceSnapshot` is the single ECS gate for list and mutation DTOs. It accepts a new entity or a strictly greater version and ignores equal or lower versions.
- `PendingApproval` permits at most one in-flight approval per invoice, so the example does not need mutation IDs or a stale-mutation registry.
- The list query passes TanStack Query's signal to `fetch`. The mutation adapter awaits `cancelQueries` before POST, so a GET started from the previous server state is aborted before the mutation result is committed.
- A successful mutation updates Query cache only when ECS accepted the DTO, and the cache merge independently refuses an equal or lower invoice version.
- Success and failure both invalidate the list after local handling. The mock server applies POST state before responding, so the verification GET cannot return a pre-mutation version.
- The query bridge compares successful `data` references, not timestamps. Monotonic ECS reconciliation remains the final guard when observers emit duplicate or rapid results.
- Reconciliation touches only `InvoiceSnapshot` and `CanApprove`; review, pending, error, and unrelated components survive refetches.

### HTTP client boundary

- `createInvoiceApi(baseUrl: URL)` owns list URL construction in `invoice-workspace`; `createInvoiceApprovalApi(baseUrl: URL)` owns approval URL construction in `invoice-approval`.
- Browser bootstrap passes `new URL("/api/", window.location.origin)`.
- Node integration tests pass `new URL("http://invoice.test/api/")`; no test relies on Node resolving a relative fetch URL.
- Every endpoint checks `response.ok` before entering a success path.
- Approval 409 responses use `InvoiceApprovalErrorResponse { message: string }` and become `InvoiceApiError` values carrying the HTTP status and normalized server message.
- The MSW handler factory receives the same base URL as the API client, avoiding wildcard or environment-dependent endpoint matching.

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
- GET responses use a `150 ms` delay and approval responses use a `250 ms` delay.
- Tests assert visible loading/pending state or control deferred resolution; they do not assert elapsed time.
- The generated `mockServiceWorker.js` is an opaque MSW artifact.

## Post-Completion

**Manual verification:**

- Open `http://127.0.0.1:4175` and inspect Network to confirm requests are intercepted by the service worker.
- Confirm refresh retains visible cached rows while showing background activity.
- Confirm tracing logs contain no DTO or mutation input values.
- Open `?variant=review` and `?approval=off` to inspect the two non-default configurations.

**External system updates:**

- None. The example has no production API, credentials, remote flag service, or deployment requirement.
