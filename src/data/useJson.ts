import { useEffect, useState } from 'react';

export interface JsonState<T> {
  data: T | null;
  error: Error | null;
  loading: boolean;
}

/** Resolve a data file name to a URL under the deployed base path (§5.2). */
export function dataUrl(name: string): string {
  return `${import.meta.env.BASE_URL}data/${name}`;
}

// Module-level cache so each file is fetched + parsed at most once per session,
// shared across every component that requests it. This preserves the "fetch
// once" property the eager DataProvider used to have, now that heavy files load
// lazily from multiple pages (issue #18) — e.g. RecentMatchesStrip on the home
// page and the Matches page share a single matches.json fetch.
const cache = new Map<string, Promise<unknown>>();

function loadJson<T>(name: string): Promise<T> {
  let promise = cache.get(name) as Promise<T> | undefined;
  if (!promise) {
    promise = fetch(dataUrl(name)).then((res) => {
      if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
      return res.json() as Promise<T>;
    });
    // Don't cache failures — evict so a later mount can retry a transient error.
    promise.catch(() => {
      if (cache.get(name) === promise) cache.delete(name);
    });
    cache.set(name, promise);
  }
  return promise;
}

/** Fetch one JSON file relative to BASE_URL, typed. Deduped via a shared cache. */
export function useJson<T>(name: string): JsonState<T> {
  const [state, setState] = useState<JsonState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });
    loadJson<T>(name)
      .then((data) => {
        if (!cancelled) setState({ data, error: null, loading: false });
      })
      .catch((error: Error) => {
        if (!cancelled) setState({ data: null, error, loading: false });
      });
    return () => {
      cancelled = true;
    };
  }, [name]);

  return state;
}
