// Deterministic JSON writer (§2 convention 3): stable key order + 2-space pretty
// print so re-runs produce byte-identical files and `git` only sees real changes
// (enables the commit-only-if-changed gate).
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DATA_DIR } from './config';

/** Recursively sort object keys so serialization is order-independent. */
function sortKeys<T>(value: T): T {
  if (Array.isArray(value)) return value.map(sortKeys) as unknown as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      out[key] = sortKeys((value as Record<string, unknown>)[key]);
    }
    return out as T;
  }
  return value;
}

export function stableStringify(value: unknown): string {
  return JSON.stringify(sortKeys(value), null, 2) + '\n';
}

/** Write a data file under public/data/, deterministically. Returns true if the
 *  on-disk contents changed. */
export function writeDataFile(name: string, value: unknown): boolean {
  const path = resolve(DATA_DIR, name);
  const next = stableStringify(value);
  let prev: string | null = null;
  try {
    prev = readFileSync(path, 'utf8');
  } catch {
    prev = null;
  }
  if (prev === next) return false;
  writeFileSync(path, next);
  return true;
}

export function readDataFile<T>(name: string): T | null {
  try {
    return JSON.parse(readFileSync(resolve(DATA_DIR, name), 'utf8')) as T;
  } catch {
    return null;
  }
}
