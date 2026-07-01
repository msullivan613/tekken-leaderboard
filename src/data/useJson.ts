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

/** Fetch one JSON file relative to BASE_URL, typed. */
export function useJson<T>(name: string): JsonState<T> {
  const [state, setState] = useState<JsonState<T>>({
    data: null,
    error: null,
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    setState({ data: null, error: null, loading: true });
    fetch(dataUrl(name))
      .then((res) => {
        if (!res.ok) throw new Error(`${name}: HTTP ${res.status}`);
        return res.json() as Promise<T>;
      })
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
