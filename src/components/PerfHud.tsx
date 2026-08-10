import { useEffect, useRef, useState } from 'react';
import { resetStats, subscribe, type ApiStats } from '../api/mockApi';

/**
 * Measures one run of the dashboard.
 *
 * A run starts when `runKey` changes and ends when nothing is in flight any
 * more. Timing therefore covers the fetching, not the cost of booting the app,
 * so the two modes are compared on the same basis.
 *
 * If a mode never fetches anything (the cache already had it), the run settles
 * immediately and the time is close to zero. That is the honest result, not a
 * rounding error: the work had already been done.
 */
export function PerfHud({ runKey }: { runKey: string }) {
  const [stats, setStats] = useState<ApiStats>({ calls: 0, inflight: 0 });
  const [elapsed, setElapsed] = useState(0);
  const [settled, setSettled] = useState(false);

  const startedAt = useRef(performance.now());
  const sawInflight = useRef(false);
  const frozen = useRef(false);
  /** When the last request finished. A waterfall goes idle between hops. */
  const lastIdleAt = useRef(0);

  useEffect(() => subscribe(setStats), []);

  // New run: clear the counters and start the clock.
  useEffect(() => {
    resetStats();
    startedAt.current = performance.now();
    sawInflight.current = false;
    frozen.current = false;
    setElapsed(0);
    setSettled(false);

    // Give the tree a moment to mount and fire its requests. If none arrive,
    // the run is served entirely from cache.
    const id = window.setTimeout(() => {
      if (!sawInflight.current && !frozen.current) {
        frozen.current = true;
        // Nothing was requested, so the screen was ready immediately. Report
        // zero rather than the length of this detection window, which is an
        // artefact of the measuring and not a cost the user paid.
        setElapsed(0);
        setSettled(true);
      }
    }, 120);
    return () => window.clearTimeout(id);
  }, [runKey]);

  /*
   * Freeze the clock once nothing has been in flight for a moment.
   *
   * The grace period matters. A waterfall drops to zero in-flight between
   * hops, because the next request cannot be made until the previous one has
   * returned. Stopping on the first idle moment would time only the first hop
   * and report the screen as finished while a panel was still loading.
   *
   * The recorded time is when the last request landed, not when the grace
   * period expired, so waiting to be sure does not inflate the measurement.
   */
  useEffect(() => {
    if (frozen.current) return;

    if (stats.inflight > 0) {
      sawInflight.current = true;
      return;
    }
    if (!sawInflight.current) return;

    lastIdleAt.current = performance.now();
    const id = window.setTimeout(() => {
      if (frozen.current) return;
      frozen.current = true;
      setElapsed(lastIdleAt.current - startedAt.current);
      setSettled(true);
    }, 150);
    return () => window.clearTimeout(id);
  }, [stats.inflight]);

  // Tick while work is outstanding.
  useEffect(() => {
    if (settled) return;
    const id = window.setInterval(() => {
      if (!frozen.current) setElapsed(performance.now() - startedAt.current);
    }, 16);
    return () => window.clearInterval(id);
  }, [settled, runKey]);

  return (
    <div className="hud" data-settled={settled}>
      <div className="hud-item">
        <span className="hud-label">Time to full render</span>
        <strong className="hud-value">{(elapsed / 1000).toFixed(2)}s</strong>
      </div>
      <div className="hud-item">
        <span className="hud-label">API calls this run</span>
        <strong className="hud-value">{stats.calls}</strong>
      </div>
      <div className="hud-item">
        <span className="hud-label">Status</span>
        <strong className="hud-value">{settled ? 'settled' : 'fetching'}</strong>
      </div>
    </div>
  );
}
