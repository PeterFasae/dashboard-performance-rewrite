import { useEffect, useState } from 'react';

/**
 * The "before" pattern: fetch in an effect, keep the result in local state.
 *
 * Each panel calls this on mount with its own fetcher. There is no shared
 * cache and no deduplication, so two panels that need the same endpoint make
 * two calls, and switching tabs unmounts and remounts everything, which makes
 * the whole set of calls again.
 *
 * The before/after toggle is the demonstration, so this mode is kept working
 * rather than left as a description.
 */
export function useLegacyFetch<T>(fetcher: () => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    fetcher().then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // Runs once per mount. It is the remount on every tab change, not this
    // effect re-running, that makes the before mode fetch everything again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading };
}
