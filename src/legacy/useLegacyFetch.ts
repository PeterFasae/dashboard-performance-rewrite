import { useEffect, useState } from 'react';

/**
 * The pattern this project replaced.
 *
 * Each panel calls this on mount with its own fetcher. There is no shared
 * cache and no deduplication, so two panels that need the same endpoint make
 * two calls, and switching tabs unmounts and remounts everything, which makes
 * the whole set of calls again.
 *
 * Kept in the repo on purpose. The before/after toggle is the demonstration,
 * and it is hard to argue the rewrite was worth it without the before.
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
    // The fetcher is a fresh closure on every render, which is part of why
    // this pattern refetched as often as it did.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { data, loading };
}
