# Invoice approval example

This example models an invoice approval workspace backed by TanStack Query and
MSW while keeping business state transitions in ECSplain.

```sh
npm run dev:invoice
```

Useful URL variants:

- `?variant=review` requires a confirmation step before approval is submitted.
- `?approval=off` loads invoices in a read-only workspace with no approval
  controls.

## Feature slices

The example is organized by vertical feature slice:

- `src/app` composes the World, QueryClient, API clients, feature flags, and
  bridge disposal.
- `src/features/invoice-workspace` owns invoice server DTOs, the invoice Query
  options, ECS invoice projections, reconciliation systems, and the workspace
  UI.
- `src/features/invoice-approval` owns approval feature state, approval systems,
  approval API calls, mutation integration, and approval controls.
- `src/mocks` owns the mutable MSW-backed server store and request handlers.
- `src/instrumentation` owns cross-cutting tracing middleware.

Dependency direction stays inward toward local feature contracts. The app root
wires slices together; workspace code does not import approval UI, approval
systems depend only on workspace model contracts, and mocks reuse the same DTO
types as the browser and tests.

## Query and ECS ownership

| State | Owner |
| --- | --- |
| HTTP fetch status, retries, cancellation, stale time, and remote cache | TanStack Query |
| Invoice entities, server snapshots used by systems, approval capability, rollout configuration, review state, pending state, and approval errors | ECSplain |
| Optimistic approval UI | ECSplain only |
| Mock server data and delayed responses | MSW store |

TanStack Query is the only HTTP cache. ECS stores a monotonic working-set
projection so systems can make synchronous decisions without owning fetch
status or cache policy.

## Data flow

The app creates one `QueryClient`, one `World`, one unique `InvoiceId` index,
one invoice query-options object, and one QueryObserver bridge. React and the
bridge share the exact same query options, so multiple observers deduplicate the
initial `GET /api/invoices` request.

The bridge observes only the invoice query. It reconciles successful query data
references into ECS by running `reconcileInvoices`; it does not subscribe to the
entire Query cache. Reconciliation uses the unique `InvoiceId` index and accepts
only a strictly higher server `version`, so an older list response cannot
regress an invoice or remove transient approval components.

Manual refresh calls
`queryClient.invalidateQueries({ queryKey: invoiceQueryKey })`. Cached ECS rows
remain visible while TanStack Query reports background fetching.

## Approval flow

React handlers are thin: they run ECS systems and pass returned approval
commands to the mutation adapter.

In the direct variant, `requestInvoiceApproval` validates rollout state,
server status, `CanApprove`, and absence of `PendingApproval`, then attaches
pending state and returns a command. In the review variant, the first request
adds `ApprovalReview`; confirmation attaches pending state and returns the same
command shape.

Before an approval POST, the adapter cancels active invoice queries with the
invoice query key. The query function passes TanStack Query's abort signal to
`fetch`, so an older delayed GET is aborted instead of racing the POST result.

Successful POST responses run `applyInvoiceApprovalSuccess` first. Only if ECS
accepts the returned higher-version DTO does the adapter merge it into the
Query cache, and that merge is version-aware. Every success still invalidates
the invoice query for background verification.

Non-2xx approval responses throw `InvoiceApiError`, which carries the HTTP
status and normalized server message. On failure, ECS clears pending state,
preserves the last accepted snapshot, stores the visible error, and invalidates
the query without writing optimistic data to the Query cache.

## MSW endpoints

The browser worker and Vitest integration tests reuse the same handler factory:

- `GET /api/invoices` waits 150 ms and returns three invoices.
- `POST /api/invoices/:invoiceId/approve` waits 250 ms, approves the first
  pending invoice by incrementing its version, returns HTTP 409 for the second,
  and leaves the third already approved.

The mock store is created fresh per test and once for the browser session, so
tests do not leak mutable server state.

## Tracing

The app root installs synchronous observing middleware that logs
`ecsplain:system` events with diagnostic system name, zero-based depth, duration,
and success or error outcome. It returns the exact `next()` result and rethrows
the exact original error. It intentionally does not log middleware input because
invoice data may be sensitive.
