// Targeted tests closing the last coverage gaps on the deterministic core modules
// enforced at 100% (see vitest.config.ts `coverage.include`). These exercise the
// null/fallback branches and edge cases the behavioural tests don't reach.
import { describe, it, expect } from 'vitest';
import { buildMatches } from '../scripts/online-stats/matches';
import { mergeHistory } from '../scripts/online-stats/history';
import { rankByTier, rankBySlug, rankFromDanRank, rankFromName } from '@/data/ranks';
import {
  canonicalizeCharacter,
  characterMeta,
  characterDisplayName,
  isKnownCharacter,
  fromCharacterId,
} from '@/data/characters';
import { mergeAppConfig } from '@/lib/config-merge';
import { makePairId } from '@/types/domain';
import type { AppConfig, HistoryFile, Match } from '@/types/data-files';
import type { Player } from '@/types/domain';
import type { TknowBattle, TknowBattleSide } from '../scripts/online-stats/tknow';

// ── ranks.ts: null-input and unknown-key fallbacks ──────────────────────────
describe('ranks helpers', () => {
  it('rankByTier: null/undefined and unknown tier → null; known tier resolves', () => {
    expect(rankByTier(null)).toBeNull();
    expect(rankByTier(undefined)).toBeNull();
    expect(rankByTier(9999)).toBeNull();
    expect(rankByTier(0)?.slug).toBe('beginner');
  });

  it('rankBySlug: falsy and unknown slug → null; known slug resolves', () => {
    expect(rankBySlug(null)).toBeNull();
    expect(rankBySlug(undefined)).toBeNull();
    expect(rankBySlug('')).toBeNull();
    expect(rankBySlug('not-a-rank')).toBeNull();
    expect(rankBySlug('beginner')?.tier).toBe(0);
  });

  it('rankFromDanRank: unranked → nulls; valid dan → slug+tier', () => {
    expect(rankFromDanRank(null)).toEqual({ slug: null, tier: null });
    const r = rankFromDanRank(0);
    expect(r.tier).toBe(0);
    expect(r.slug).toBe('beginner');
    // A normalized tier past the top of the ladder has no slug (defensive `?? null`).
    expect(rankFromDanRank(200)).toEqual({ slug: null, tier: 129 });
  });

  it('rankFromName: falsy/unknown → nulls; known display name resolves', () => {
    expect(rankFromName(null)).toEqual({ slug: null, tier: null });
    expect(rankFromName('   ')).toEqual({ slug: null, tier: null });
    expect(rankFromName('Not A Rank')).toEqual({ slug: null, tier: null });
    const r = rankFromName('  beginner  ');
    expect(r.slug).toBe('beginner');
    expect(r.tier).toBe(0);
  });
});

// ── characters.ts: lookups and fallbacks ────────────────────────────────────
describe('character helpers', () => {
  it('canonicalizeCharacter: falsy/unknown name → null; known name → slug', () => {
    expect(canonicalizeCharacter(null)).toBeNull();
    expect(canonicalizeCharacter('')).toBeNull();
    expect(canonicalizeCharacter('Nobody')).toBeNull();
    expect(canonicalizeCharacter('Devil Jin')).toBe('devil_jin');
  });

  it('fromCharacterId: null id and unknown id → null; known id → slug', () => {
    expect(fromCharacterId(null)).toBeNull();
    expect(fromCharacterId(999)).toBeNull();
    expect(fromCharacterId(0)).toBe('paul');
  });

  it('characterMeta: known slug → meta; unknown → null', () => {
    expect(characterMeta('jin')?.displayName).toBe('Jin');
    expect(characterMeta('nope')).toBeNull();
  });

  it('characterDisplayName: known → display; unknown → slug fallback', () => {
    expect(characterDisplayName('jin')).toBe('Jin');
    expect(characterDisplayName('mystery')).toBe('mystery');
  });

  it('isKnownCharacter: true for roster slug, false otherwise', () => {
    expect(isKnownCharacter('jin')).toBe(true);
    expect(isKnownCharacter('mystery')).toBe(false);
  });
});

// ── config-merge.ts: deep merge, array replace, non-object/undefined edges ───
describe('mergeAppConfig / deepMerge', () => {
  it('deep-merges nested objects; override wins, new keys added', () => {
    const merged = mergeAppConfig(
      { a: { x: 1, y: 2 }, keep: true },
      { a: { y: 3 }, b: 4 },
    ) as unknown as Record<string, unknown>;
    expect(merged).toEqual({ a: { x: 1, y: 3 }, keep: true, b: 4 });
  });

  it('arrays replace rather than concatenate', () => {
    const merged = mergeAppConfig({ list: [1, 2, 3] }, { list: [9] }) as unknown as {
      list: number[];
    };
    expect(merged.list).toEqual([9]);
  });

  it('non-object base returns the override', () => {
    expect(mergeAppConfig(5 as unknown, { a: 1 })).toEqual({ a: 1 });
  });

  it('undefined override falls back to the base', () => {
    const base = { a: 1 };
    expect(mergeAppConfig(base, undefined)).toEqual(base);
  });
});

// ── domain.ts ───────────────────────────────────────────────────────────────
describe('makePairId', () => {
  it('joins tekken_id and character with a colon', () => {
    expect(makePairId('3fee-J699-M7An', 'jin')).toBe('3fee-J699-M7An:jin');
  });
});

// ── history.ts: mergeHistory with no prior file ─────────────────────────────
describe('mergeHistory', () => {
  it('seeds a fresh file when existing is null', () => {
    const incoming: HistoryFile = {
      schemaVersion: 1,
      source: 'tknow',
      updatedAt: '2026-07-02T00:00:00Z',
      series: {
        'id:jin': { playerId: 'matt', character: 'jin', points: [['2026-07-01', 10]] },
      },
    };
    const merged = mergeHistory(null, incoming);
    expect(merged.series['id:jin'].points).toEqual([['2026-07-01', 10]]);
    expect(merged.updatedAt).toBe('2026-07-02T00:00:00Z');
  });
});

// ── matches.ts: buildMatches retention edge cases ───────────────────────────
describe('buildMatches edge cases', () => {
  const CFG = { matches: { recentWindowDays: 30, feedMaxPerPlayer: 40 } } as AppConfig;
  const NOW = new Date('2026-07-02T00:00:00Z');
  const players: Player[] = [
    {
      id: 'matt',
      tekken_id: 'aaaa-bbbb-cccc',
      player_tag: 'Matt',
      platform: 'steam',
      main_character: 'jin',
      peak_rank: null,
    },
  ];
  const MATT = 'aaaabbbbcccc';

  function side(polarisId: string, over: Partial<TknowBattleSide> = {}): TknowBattleSide {
    return {
      name: polarisId,
      polarisId,
      character: 'jin',
      rank: 'tekken_god',
      rounds: 3,
      region: 'Americas',
      ...over,
    };
  }
  function battle(o: {
    battleId: string;
    battleAt: string;
    p1: TknowBattleSide;
    p2: TknowBattleSide;
    winner?: 'p1' | 'p2';
  }): TknowBattle {
    return {
      battleId: o.battleId,
      battleAt: o.battleAt,
      battleType: 'ranked',
      winner: o.winner ?? 'p1',
      p1: o.p1,
      p2: o.p2,
    };
  }

  it('skips battles with an unparseable timestamp', () => {
    const res = buildMatches(
      [
        battle({
          battleId: 'bad',
          battleAt: 'not-a-date',
          p1: side(MATT),
          p2: side('stranger'),
        }),
      ],
      players,
      [],
      CFG,
      NOW,
    );
    expect(res.matches).toHaveLength(0);
    expect(res.archived).toHaveLength(0);
  });

  it('skips battles where neither side is a tracked player', () => {
    const res = buildMatches(
      [
        battle({
          battleId: 'x',
          battleAt: '2026-07-01T00:00:00Z',
          p1: side('foo'),
          p2: side('bar'),
        }),
      ],
      players,
      [],
      CFG,
      NOW,
    );
    expect(res.matches).toHaveLength(0);
  });

  it('resolves the crew side when only p2 is a tracked player (crewSideId fallback)', () => {
    const res = buildMatches(
      [
        battle({
          battleId: 'p2crew',
          battleAt: '2026-07-01T00:00:00Z',
          p1: side('stranger'),
          p2: side(MATT),
        }),
      ],
      players,
      [],
      CFG,
      NOW,
    );
    expect(res.matches).toHaveLength(1);
    expect(res.matches[0].b.playerId).toBe('matt');
    expect(res.matches[0].a.playerId).toBeNull();
  });

  it('breaks feed-sort ties on id when timestamps are equal', () => {
    const at = '2026-07-01T00:00:00Z';
    const prior: Match[] = [
      {
        id: 'zzz',
        playedAt: at,
        battleType: 'ranked',
        a: {
          playerId: 'matt',
          name: 'Matt',
          polarisId: MATT,
          character: 'jin',
          rank: 'tekken_god',
        },
        b: {
          playerId: null,
          name: 'S',
          polarisId: 's',
          character: 'jin',
          rank: 'tekken_god',
        },
        roundsA: 3,
        roundsB: 0,
        winner: 'a',
        crew: false,
      },
      {
        id: 'aaa',
        playedAt: at,
        battleType: 'ranked',
        a: {
          playerId: 'matt',
          name: 'Matt',
          polarisId: MATT,
          character: 'jin',
          rank: 'tekken_god',
        },
        b: {
          playerId: null,
          name: 'S',
          polarisId: 's',
          character: 'jin',
          rank: 'tekken_god',
        },
        roundsA: 3,
        roundsB: 0,
        winner: 'a',
        crew: false,
      },
    ];
    const res = buildMatches([], players, prior, CFG, NOW);
    expect(res.matches.map((m) => m.id)).toEqual(['aaa', 'zzz']);
  });
});
