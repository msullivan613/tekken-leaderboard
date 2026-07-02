import { describe, it, expect } from 'vitest';
import {
  appendHistory,
  archiveName,
  mergeHistory,
  splitHistory,
  type HistoryRow,
} from '../scripts/online-stats/history';
import { stableStringify } from '../scripts/shared/atomicWrite';
import type { HistoryFile } from '@/types/data-files';

const ROWS: HistoryRow[] = [
  { pairId: 'AAA:jin', playerId: 'matt', character: 'jin', value: 21 },
  { pairId: 'BBB:kazuya', playerId: 'nick', character: 'kazuya', value: 1875 },
];

describe('appendHistory', () => {
  it('appends today’s point per series and keeps points sorted', () => {
    let f = appendHistory(null, 'tknow', ROWS, '2026-07-01', 'now1');
    f = appendHistory(f, 'tknow', ROWS, '2026-07-02', 'now2');
    expect(f.series['AAA:jin'].points).toEqual([
      ['2026-07-01', 21],
      ['2026-07-02', 21],
    ]);
    expect(f.updatedAt).toBe('now2');
  });

  it('is idempotent for a repeated date (re-runs add nothing)', () => {
    let f = appendHistory(null, 'tknow', ROWS, '2026-07-01', 'now1');
    f = appendHistory(f, 'tknow', ROWS, '2026-07-01', 'now1');
    expect(f.series['AAA:jin'].points).toEqual([['2026-07-01', 21]]);
  });
});

describe('splitHistory', () => {
  it('keeps recent-window points live and rolls older ones into per-year archives', () => {
    const file: HistoryFile = {
      schemaVersion: 1,
      source: 'wavu',
      updatedAt: 'now',
      series: {
        'AAA:jin': {
          playerId: 'matt',
          character: 'jin',
          points: [
            ['2024-05-01', 1],
            ['2025-08-01', 2],
            ['2026-06-20', 3],
            ['2026-07-01', 4],
          ],
        },
      },
    };
    const now = new Date('2026-07-01T00:00:00Z');
    const { live, archivesByYear } = splitHistory(file, 30, now);

    // Within 30 days of 2026-07-01 → live.
    expect(live.series['AAA:jin'].points).toEqual([
      ['2026-06-20', 3],
      ['2026-07-01', 4],
    ]);
    // Older points roll into the archive for their calendar year.
    expect([...archivesByYear.keys()].sort()).toEqual(['2024', '2025']);
    expect(archivesByYear.get('2024')!.series['AAA:jin'].points).toEqual([
      ['2024-05-01', 1],
    ]);
    expect(archivesByYear.get('2025')!.series['AAA:jin'].points).toEqual([
      ['2025-08-01', 2],
    ]);
  });

  it('drops series with no remaining live points', () => {
    const file: HistoryFile = {
      schemaVersion: 1,
      source: 'wavu',
      updatedAt: 'now',
      series: {
        'OLD:jin': {
          playerId: 'matt',
          character: 'jin',
          points: [['2020-01-01', 1]],
        },
      },
    };
    const { live, archivesByYear } = splitHistory(
      file,
      30,
      new Date('2026-07-01T00:00:00Z'),
    );
    expect(live.series['OLD:jin']).toBeUndefined();
    expect(archivesByYear.get('2020')!.series['OLD:jin'].points).toEqual([
      ['2020-01-01', 1],
    ]);
  });

  it('leaves everything live when nothing exceeds the window', () => {
    const f = appendHistory(null, 'tknow', ROWS, '2026-07-01', 'now');
    const { live, archivesByYear } = splitHistory(
      f,
      730,
      new Date('2026-07-01T00:00:00Z'),
    );
    expect(archivesByYear.size).toBe(0);
    expect(Object.keys(live.series)).toEqual(['AAA:jin', 'BBB:kazuya']);
  });
});

describe('mergeHistory', () => {
  it('unions points into an existing archive, deduping by date', () => {
    const existing: HistoryFile = {
      schemaVersion: 1,
      source: 'wavu',
      updatedAt: 'old',
      series: {
        'AAA:jin': { playerId: 'matt', character: 'jin', points: [['2024-01-01', 1]] },
      },
    };
    const incoming: HistoryFile = {
      schemaVersion: 1,
      source: 'wavu',
      updatedAt: 'new',
      series: {
        'AAA:jin': {
          playerId: 'matt',
          character: 'jin',
          points: [
            ['2024-01-01', 1],
            ['2024-02-01', 2],
          ],
        },
        'BBB:kazuya': {
          playerId: 'nick',
          character: 'kazuya',
          points: [['2024-03-01', 3]],
        },
      },
    };
    const merged = mergeHistory(existing, incoming);
    expect(merged.series['AAA:jin'].points).toEqual([
      ['2024-01-01', 1],
      ['2024-02-01', 2],
    ]);
    expect(merged.series['BBB:kazuya'].points).toEqual([['2024-03-01', 3]]);
    expect(merged.updatedAt).toBe('new');
  });
});

describe('archiveName', () => {
  it('builds <base>.<year>.json', () => {
    expect(archiveName('rankhistory', '2025')).toBe('rankhistory.2025.json');
  });
});

describe('stableStringify inlineArrays', () => {
  it('renders primitive-only arrays on one line but keeps structure pretty', () => {
    const file = appendHistory(null, 'tknow', ROWS, '2026-07-01', 'now');
    const out = stableStringify(file, { inlineArrays: true });
    // Each tuple collapses to one line...
    expect(out).toContain('["2026-07-01", 21]');
    // ...while the enclosing points array and object stay multi-line.
    expect(out).toContain('"points": [\n');
  });

  it('matches JSON.stringify byte-for-byte when inlineArrays is off', () => {
    const file = appendHistory(null, 'tknow', ROWS, '2026-07-01', 'now');
    expect(stableStringify(file)).toBe(
      JSON.stringify(
        {
          schemaVersion: 1,
          series: {
            'AAA:jin': {
              character: 'jin',
              playerId: 'matt',
              points: [['2026-07-01', 21]],
            },
            'BBB:kazuya': {
              character: 'kazuya',
              playerId: 'nick',
              points: [['2026-07-01', 1875]],
            },
          },
          source: 'tknow',
          updatedAt: 'now',
        },
        null,
        2,
      ) + '\n',
    );
  });
});
