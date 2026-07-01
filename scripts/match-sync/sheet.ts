// Google Sheet access (spec §4.1/§4.2): fetch the published-CSV export and parse
// rows by header name (case-insensitive, order-independent). No auth.
import { parse } from 'csv-parse/sync';
import { fetchWithRetry } from '../shared/http';

export type SheetRow = Record<string, string>;

/** Parse CSV text into row objects keyed by lowercased header. Exported for tests. */
export function parseSheetCsv(text: string): SheetRow[] {
  const records = parse(text, {
    columns: (header: string[]) => header.map((h) => h.trim().toLowerCase()),
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
  }) as SheetRow[];
  return records;
}

export async function fetchSheet(csvUrl: string): Promise<SheetRow[]> {
  const res = await fetchWithRetry(csvUrl, {
    headers: { Accept: 'text/csv' },
  });
  if (!res.ok) throw new Error(`sheet fetch: HTTP ${res.status}`);
  return parseSheetCsv(await res.text());
}
