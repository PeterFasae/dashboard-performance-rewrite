# Dashboard data fetching, before and after

A standalone demo of two ways to load data for the same dashboard screen: each panel fetching
for itself, and one shared query layer built on TanStack Query. A toggle switches between them,
and a strip at the top counts every API call.

**Everything behind the screen is simulated.** The endpoints, their latency and all the data are
in [`src/api/mockApi.ts`](src/api/mockApi.ts). There is no server and no network request. This is
a reconstruction written from scratch to make a common data-fetching problem inspectable. It
contains no employer's code, and nothing in it is a measurement of a real system.

```bash
npm install
npm run dev     # the demo: Before/After toggle, two tabs, a cold reload, and the request counter
npm test        # renders the app, clicks through it, and checks every number below
npm run build   # typecheck and production build
```

Tested with Node.js 24.

## What it shows

Both modes render the same panels and call the same functions in `mockApi.ts`. The before mode
has three problems the after mode doesn't.

**Duplication.** The headline strip and the summary card both want `/metrics`, and neither knows
about the other, so it is requested twice. In the after mode they share a query key, so between
them they cost one request.

**A waterfall.** The orders panel renders, and only then does its child mount and ask for the
accounts it needs to label each row. The second request cannot start until the first has
finished, so the two delays add up instead of overlapping. In the after mode both are declared at
the top level and start together.

**No caching.** Nothing survives a tab change, so leaving a tab and coming back pays the full
price again. In the after mode the data stays in the query cache, so moving between tabs costs
nothing.

## The numbers

### Request counts

Counted by [`src/requests.test.tsx`](src/requests.test.tsx), which renders the real app and
clicks through each step. They don't depend on the machine or on the simulated delays.

| Step | Before | After |
|---|---|---|
| Cold load, Overview | 6 calls: `/metrics` ×2, `/customers` ×2, `/orders`, `/activity` | 4 calls, one per endpoint |
| Overview → Accounts | 4 calls | 0 calls |
| Accounts → Overview | 6 calls | 0 calls |
| Cold reload | 6 calls | 4 calls |
| Simulate a refund | — | 3 calls: `/orders`, `/metrics`, `/activity` |

### Times

**These are simulated, not measured.** They follow from the made-up delays in `mockApi.ts`:
`/activity` 260ms, `/metrics` 280ms, `/orders` 340ms and `/customers` 420ms.

| Step | Before | After | Why |
|---|---|---|---|
| Cold load, Overview | 0.76s | 0.42s | Before: `/customers` waits for `/orders`, 340 + 420ms. After: all four start together and finish with the slowest, 420ms |
| Overview → Accounts | 0.42s | 0.00s | Before: four calls in parallel, the slowest is `/customers`. After: nothing to fetch |
| Accounts → Overview | 0.76s | 0.00s | As the cold load, and served from cache |

The tests run on fake timers and assert these exact values, derived from the delay table. In a
browser the on-screen timer reads the same to within about 10ms: three runs gave 0.76–0.77s and
0.42–0.43s. The numbers show how the two approaches order their requests. They say nothing about
how fast any real dashboard is, because nothing here is real except the React and TanStack Query
code.

## What differs between the modes besides the fetching

So the comparison can be read fairly:

- **Loading placeholders.** The before mode shows a spinner and the after mode a skeleton. This
  changes how loading looks, not what is requested or when.
- **Both modes fetch more than one tab needs.** The before mode's top-level panels fetch on
  either tab, and the after mode declares every query on either tab. That is why a cold load of
  Accounts costs four calls in both, and why the after mode's tab switch costs nothing.
- **The refund doesn't write anything.** "Simulate a refund" invalidates the orders, metrics and
  activity queries, as a real write would, and they refetch. No request is sent for the write
  itself, and the data doesn't change.
- **The API is ideal.** Delays are fixed, nothing fails and nothing is retried, so the demo shows
  request ordering and nothing about error handling or variable latency.

## Notes on the measurement

`<StrictMode>` is deliberately not used. It mounts, unmounts and remounts every component in
development, which fires each effect twice. The before mode fetches from an effect, so StrictMode
doubles its requests and only its requests. A test wraps the app in StrictMode to show this: the
before mode makes 12 requests on a cold load instead of 6, and the after mode stays at 4.

The clock starts when a run starts (a tab change, a mode change or a cold reload), not when the
page loads, so app boot time is not counted against either mode.

A run is finished when nothing has been in flight for 150ms. The grace period is needed because a
waterfall goes idle between hops: the next request cannot be made until the previous one returns.
Stopping at the first idle moment would time only the first hop. The time recorded is when the
last response arrived, not when the grace period expired.

When a run makes no requests at all, it reports 0.00s. The detection window is an artefact of
measuring, not a cost anyone paid.

## Layout

```
src/
  api/mockApi.ts              simulated endpoints and delays, request counter, request log
  legacy/useLegacyFetch.ts    fetch-on-mount, no cache, no dedupe
  legacy/LegacyDashboard.tsx  the waterfall and the duplicate request
  rewrite/queries.ts          shared keys, invalidation after a write
  rewrite/RewrittenDashboard.tsx
  components/PerfHud.tsx      the on-screen counter and timer
  panels/contents.tsx         presentation, shared by both modes
  requests.test.tsx           the checks behind every number in this README
```
