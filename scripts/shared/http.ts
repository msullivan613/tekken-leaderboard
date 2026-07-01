// Small fetch helpers: politeness delay + retry-with-backoff (§3.1).

export function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

export interface FetchOptions {
  headers?: Record<string, string>;
  retries?: number;
  backoffMs?: number;
  timeoutMs?: number;
}

/** Fetch with retry/backoff. Retries on network error and 5xx/429; throws on
 *  exhausting retries or on a non-retryable 4xx (the caller decides how to
 *  degrade). */
export async function fetchWithRetry(
  url: string,
  opts: FetchOptions = {},
): Promise<Response> {
  const { headers, retries = 2, backoffMs = 800, timeoutMs = 15000 } = opts;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const res = await fetch(url, { headers, signal: controller.signal });
      clearTimeout(timer);
      if (res.status === 429 || res.status >= 500) {
        lastErr = new Error(`${url}: HTTP ${res.status}`);
      } else {
        return res;
      }
    } catch (err) {
      lastErr = err;
    }
    if (attempt < retries) await sleep(backoffMs * (attempt + 1));
  }
  throw lastErr instanceof Error ? lastErr : new Error(String(lastErr));
}
