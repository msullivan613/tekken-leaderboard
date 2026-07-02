// Append-only rank/MMR history with bounded live files (spec §2.6, §3.4).
//
// Each daily run appends one `[date, value]` per (player, character) series. Left
// unchecked these files grow forever (issue #10), so the live file is capped to a
// recent window of `history.maxDaysInline` days and older points are rolled into
// per-year archive files (`rankhistory.<year>.json` / `mmrhistory.<year>.json`).
// Archives are cold storage — they preserve the full record for export but the
// frontend charts only load the live (recent-window) file. Pure + unit-tested.
import type { HistoryFile, HistoryPoint } from '@/types/data-files';

const DAY_MS = 86_400_000;

export interface HistoryRow {
  pairId: string;
  playerId: string;
  character: string;
  value: number;
}

/** Append today's [date, value] to each pair's series, idempotently (§3.4). */
export function appendHistory(
  existing: HistoryFile | null,
  source: 'tknow' | 'wavu',
  rows: HistoryRow[],
  date: string,
  now: string,
): HistoryFile {
  const file: HistoryFile = existing ?? {
    schemaVersion: 1,
    source,
    updatedAt: now,
    series: {},
  };
  file.updatedAt = now;
  for (const row of rows) {
    const series = (file.series[row.pairId] ??= {
      playerId: row.playerId,
      character: row.character,
      points: [],
    });
    if (!series.points.some(([d]) => d === date)) {
      series.points.push([date, row.value]);
    }
    series.points.sort((a, b) => a[0].localeCompare(b[0]));
  }
  return file;
}

/** The archive file name for a given base ("rankhistory"/"mmrhistory") and year. */
export function archiveName(base: string, year: string): string {
  return `${base}.${year}.json`;
}

/** Merge `incoming` series/points into `existing` (or a fresh file), deduping
 *  points by date and keeping each series sorted. Used to fold rolled-off points
 *  into their year's archive without disturbing points already there. */
export function mergeHistory(
  existing: HistoryFile | null,
  incoming: HistoryFile,
): HistoryFile {
  const file: HistoryFile = existing ?? {
    schemaVersion: 1,
    source: incoming.source,
    updatedAt: incoming.updatedAt,
    series: {},
  };
  file.updatedAt = incoming.updatedAt;
  for (const [pairId, inSeries] of Object.entries(incoming.series)) {
    const series = (file.series[pairId] ??= {
      playerId: inSeries.playerId,
      character: inSeries.character,
      points: [],
    });
    const seen = new Set(series.points.map(([d]) => d));
    for (const point of inSeries.points) {
      if (!seen.has(point[0])) {
        series.points.push(point);
        seen.add(point[0]);
      }
    }
    series.points.sort((a, b) => a[0].localeCompare(b[0]));
  }
  return file;
}

export interface SplitHistoryResult {
  /** The recent-window file to keep as the live rankhistory.json/mmrhistory.json. */
  live: HistoryFile;
  /** Rolled-off points grouped by calendar year (of the point's date). */
  archivesByYear: Map<string, HistoryFile>;
}

/** Split a history file into a live recent-window file plus per-year archives.
 *  A point is "live" iff its date is within `maxDaysInline` days of `now`; older
 *  points roll into the archive for their year. Series left empty in the live file
 *  are dropped. Deterministic: same input ⇒ same output within a UTC day. */
export function splitHistory(
  file: HistoryFile,
  maxDaysInline: number,
  now: Date,
): SplitHistoryResult {
  const cutoff = now.getTime() - maxDaysInline * DAY_MS;
  const live: HistoryFile = {
    schemaVersion: file.schemaVersion,
    source: file.source,
    updatedAt: file.updatedAt,
    series: {},
  };
  const archivesByYear = new Map<string, HistoryFile>();

  for (const [pairId, series] of Object.entries(file.series)) {
    const keep: HistoryPoint[] = [];
    for (const point of series.points) {
      if (Date.parse(point[0]) >= cutoff) {
        keep.push(point);
        continue;
      }
      const year = point[0].slice(0, 4);
      let archive = archivesByYear.get(year);
      if (!archive) {
        archive = {
          schemaVersion: file.schemaVersion,
          source: file.source,
          updatedAt: file.updatedAt,
          series: {},
        };
        archivesByYear.set(year, archive);
      }
      const aSeries = (archive.series[pairId] ??= {
        playerId: series.playerId,
        character: series.character,
        points: [],
      });
      aSeries.points.push(point);
    }
    if (keep.length > 0) {
      live.series[pairId] = {
        playerId: series.playerId,
        character: series.character,
        points: keep,
      };
    }
  }

  return { live, archivesByYear };
}
