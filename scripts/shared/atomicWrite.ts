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

export interface StringifyOptions {
  /** Render arrays whose elements are all primitives on a single line, e.g.
   *  `["2026-07-01", 2107]`. Collapses history's `[date, value]` tuples from four
   *  lines to one (~5–6× smaller) while keeping the surrounding structure pretty.
   *  The outer container (an array of such tuples) stays multi-line. */
  inlineArrays?: boolean;
}

function isPrimitive(v: unknown): boolean {
  return v === null || typeof v !== 'object';
}

/** Pretty-print like `JSON.stringify(v, null, 2)` but, when `inlineArrays` is set,
 *  keep primitive-only arrays on one line. Matches JSON.stringify's output byte-for-
 *  byte for every other node so the commit-if-changed gate stays intact. */
function serialize(value: unknown, indent: string): string {
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every(isPrimitive)) {
      return '[' + value.map((v) => JSON.stringify(v)).join(', ') + ']';
    }
    const inner = indent + '  ';
    const items = value.map((v) => inner + serialize(v, inner));
    return '[\n' + items.join(',\n') + '\n' + indent + ']';
  }
  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0) return '{}';
    const inner = indent + '  ';
    const items = entries.map(
      ([k, v]) => inner + JSON.stringify(k) + ': ' + serialize(v, inner),
    );
    return '{\n' + items.join(',\n') + '\n' + indent + '}';
  }
  return JSON.stringify(value) as string;
}

export function stableStringify(value: unknown, opts: StringifyOptions = {}): string {
  const sorted = sortKeys(value);
  if (opts.inlineArrays) return serialize(sorted, '') + '\n';
  return JSON.stringify(sorted, null, 2) + '\n';
}

/** Write a data file under public/data/, deterministically. Returns true if the
 *  on-disk contents changed. */
export function writeDataFile(
  name: string,
  value: unknown,
  opts: StringifyOptions = {},
): boolean {
  const path = resolve(DATA_DIR, name);
  const next = stableStringify(value, opts);
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
