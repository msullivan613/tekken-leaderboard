import { describe, it, expect } from 'vitest';
import {
  cutoffDate,
  gamesInWindow,
  mmrDelta,
  rankDelta,
  recentForm,
  seriesDelta,
} from '@/lib/trends';
import type { HistoryFile, Match, MatchSide } from '@/types/data-files';
import type { CharacterSlug } from '@/types/domain';

const NOW = new Date('2026-08-31T12:00:00.000Z');

function history(points: Array<[string, number]>): HistoryFile {
  return {
    schemaVersion: 1,
    source: 'wavu',
    updatedAt: NOW.toISOString(),
    series: {
      'fop:reina': { playerId: 'fop', character: 'reina' as CharacterSlug, points },
    },
  };
}

function side(playerId: string | null, character: string): MatchSide {
  return {
    playerId,
    name: playerId ?? 'Random',
    polarisId: `${playerId ?? 'x'}-polaris`,
    character: character as CharacterSlug,
    rank: null,
  };
}

function match(over: Partial<Match> & Pick<Match, 'id' | 'playedAt'>): Match {
  return {
    battleType: 'ranked',
    a: side('fop', 'reina'),
    b: side(null, 'kuma'),
    roundsA: 3,
    roundsB: 1,
    winner: 'a',
    crew: false,
    ...over,
  };
}

describe('cutoffDate', () => {
  it('returns the ISO date `days` back, matching history point keys', () => {
    expect(cutoffDate(7, NOW)).toBe('2026-08-24');
    expect(cutoffDate(0, NOW)).toBe('2026-08-31');
  });
});

describe('seriesDelta', () => {
  it('measures latest minus the last point at or before the cutoff', () => {
    const file = history([
      ['2026-08-20', 1500],
      ['2026-08-24', 1604],
      ['2026-08-28', 1620],
      ['2026-08-31', 1642],
    ]);
    // Baseline is the 08-24 point (inclusive), not the older 08-20 one.
    expect(seriesDelta(file, 'fop:reina', 7, NOW)).toBe(38);
  });

  it('reports losses as negative', () => {
    const file = history([
      ['2026-08-22', 1600],
      ['2026-08-31', 1588],
    ]);
    expect(seriesDelta(file, 'fop:reina', 7, NOW)).toBe(-12);
  });

  it('is null when the series does not reach back past the cutoff', () => {
    // Both points sit inside the window, so we cannot know the value 7d ago.
    const file = history([
      ['2026-08-29', 1610],
      ['2026-08-31', 1642],
    ]);
    expect(seriesDelta(file, 'fop:reina', 7, NOW)).toBeNull();
  });

  it('is null for a single-point series, a missing pair, and a missing file', () => {
    expect(seriesDelta(history([['2026-08-01', 1500]]), 'fop:reina', 7, NOW)).toBeNull();
    expect(seriesDelta(history([]), 'nobody:paul', 7, NOW)).toBeNull();
    expect(seriesDelta(null, 'fop:reina', 7, NOW)).toBeNull();
  });

  it('exposes mmrDelta and rankDelta over the same walk', () => {
    const file = history([
      ['2026-08-01', 19],
      ['2026-08-31', 21],
    ]);
    expect(rankDelta(file, 'fop:reina', 7, NOW)).toBe(2);
    expect(mmrDelta(file, 'fop:reina', 7, NOW)).toBe(2);
  });
});

describe('recentForm', () => {
  const matches: Match[] = [
    match({ id: '1', playedAt: '2026-08-25T00:00:00Z', winner: 'a' }),
    match({ id: '2', playedAt: '2026-08-27T00:00:00Z', winner: 'b' }),
    match({ id: '3', playedAt: '2026-08-29T00:00:00Z', winner: 'a' }),
  ];

  it('returns results most recent first', () => {
    expect(recentForm(matches, 'fop')).toEqual(['W', 'L', 'W']);
  });

  it('reads the result from whichever side the player is on', () => {
    // Player sits on side B and side B won.
    const asB = [
      match({
        id: '4',
        playedAt: '2026-08-30T00:00:00Z',
        a: side(null, 'kuma'),
        b: side('fop', 'reina'),
        winner: 'b',
      }),
    ];
    expect(recentForm(asB, 'fop')).toEqual(['W']);
  });

  it('filters to one character in Pairs view', () => {
    const mixed = [
      ...matches,
      match({
        id: '5',
        playedAt: '2026-08-30T00:00:00Z',
        a: side('fop', 'lili'),
        winner: 'b',
      }),
    ];
    expect(recentForm(mixed, 'fop', 'lili' as CharacterSlug)).toEqual(['L']);
    expect(recentForm(mixed, 'fop')).toHaveLength(4);
  });

  it('caps at n and ignores players who did not play', () => {
    expect(recentForm(matches, 'fop', null, 2)).toEqual(['W', 'L']);
    expect(recentForm(matches, 'burny')).toEqual([]);
    expect(recentForm([], 'fop')).toEqual([]);
    expect(recentForm(null, 'fop')).toEqual([]);
  });
});

describe('gamesInWindow', () => {
  const matches: Match[] = [
    match({ id: '1', playedAt: '2026-08-01T00:00:00Z' }), // outside 7d
    match({ id: '2', playedAt: '2026-08-27T00:00:00Z' }),
    match({ id: '3', playedAt: '2026-08-30T00:00:00Z', a: side('fop', 'lili') }),
  ];

  it('counts only matches inside the window', () => {
    expect(gamesInWindow(matches, 'fop', 7, null, NOW)).toBe(2);
    expect(gamesInWindow(matches, 'fop', 60, null, NOW)).toBe(3);
  });

  it('narrows to one character when given', () => {
    expect(gamesInWindow(matches, 'fop', 7, 'lili' as CharacterSlug, NOW)).toBe(1);
  });

  it('is zero for an unknown player or empty feed', () => {
    expect(gamesInWindow(matches, 'burny', 7, null, NOW)).toBe(0);
    expect(gamesInWindow(null, 'fop', 7, null, NOW)).toBe(0);
  });
});
