# Customer dashboard — data-fetching rewrite

A runnable before/after demonstrating the shape of a real change: replacing per-panel
fetching with a single shared query layer, which is what a dashboard performance fix at
BlueBow Group actually involved.

The two modes are the same screen, calling the same API through the same function.
The only difference is how the data is asked for.

```bash
npm install
npm run dev
```

## What it shows

Measured in the app itself, with the instrumentation strip at the top:

| | Before | After |
|---|---|---|
| Cold load, Overview | 0.77s, 6 API calls | 0.42s, 4 API calls |
| Switch to another tab | 0.42s, 4 calls | 0.00s, 0 calls |
| Return to a visited tab | 0.77s, 6 calls | 0.00s, 0 calls |

Two separate problems are being fixed.

**Duplication.** The headline strip and the summary card both want `/metrics`, and
neither knows about the other, so it is requested twice. In the rewrite they share a
query key, so between them they cost one request.

**A waterfall.** The orders panel renders, and only then does its child mount and ask
for the accounts it needs to label each row. The second request cannot start until the
first has finished, so the latencies add up instead of overlapping. In the rewrite both
are declared at the top level and start together. This is the larger of the two costs,
and it is what the network panel showed on the real thing.

**No caching.** Nothing survives a tab change, so leaving a tab and coming back pays
the full price again. This is why the third row of the table matters more than the
first: most people do not cold-load a dashboard, they move around inside it.

## Layout

```
src/
  api/mockApi.ts              simulated endpoints, latency, request counter
  legacy/useLegacyFetch.ts    fetch-on-mount, no cache, no dedupe
  legacy/LegacyDashboard.tsx  the waterfall and the duplicate request
  rewrite/queries.ts          shared keys, invalidation on write
  rewrite/RewrittenDashboard.tsx
  components/PerfHud.tsx      the measurement
  panels/contents.tsx         presentation, shared by both modes
```

## Notes on the measurement

Some care was needed to keep the comparison honest.

`<StrictMode>` is deliberately not used. It mounts, unmounts and remounts every
component in development, which fires each effect twice. The legacy mode fetches from
an effect, so StrictMode doubled its request count and only its request count. The
comparison would have been measuring a React development behaviour.

The clock starts when the dashboard mounts rather than when the page loads, so app
boot time is not counted against either mode.

A run is finished when nothing has been in flight for 150ms. The grace period is
needed because a waterfall goes idle between hops: the next request cannot be made
until the previous one returns. Stopping at the first idle moment timed only the first
hop and reported the screen as ready while a panel was still loading. The time recorded
is when the last request landed, not when the grace period expired.

When a run makes no requests at all, it reports 0.00s. The detection window is an
artefact of measuring, not a cost anyone paid.

## What this is

A reconstruction, built to make the case study inspectable. The production work was at
BlueBow Group in 2025 and that code is theirs. The pattern, the reasoning and the shape
of the problem are the same; the figures on my CV are from the real system, and the
figures in the table above are from this demo.

Latency values in `mockApi.ts` are in the range the original endpoints sat in, roughly
260-420ms.
