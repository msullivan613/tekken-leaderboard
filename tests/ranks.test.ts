import { describe, it, expect } from 'vitest';
import {
  normalizeDanRank,
  rankFromDanRank,
  rankByTier,
  rankBySlug,
  RANK_LADDER,
} from '@/data/ranks';

describe('rank normalization (§7.5)', () => {
  it('passes through the canonical 0..37 range', () => {
    expect(normalizeDanRank(0)).toBe(0);
    expect(normalizeDanRank(28)).toBe(28);
    expect(normalizeDanRank(29)).toBe(29);
  });

  it('folds the 100+ God of Destruction block onto 29..36', () => {
    expect(normalizeDanRank(100)).toBe(29);
    expect(normalizeDanRank(107)).toBe(36);
  });

  it('maps 765 to Infinity (37)', () => {
    expect(normalizeDanRank(765)).toBe(37);
  });

  it('treats null as unranked', () => {
    expect(normalizeDanRank(null)).toBeNull();
    expect(rankFromDanRank(null)).toEqual({ slug: null, tier: null });
  });

  it('produces a stable slug for a dan int', () => {
    expect(rankFromDanRank(28)).toEqual({ slug: 'tekken_god_supreme', tier: 28 });
    expect(rankFromDanRank(21)).toEqual({ slug: 'fujin', tier: 21 });
  });

  it('ladder is ordered and round-trips slug↔tier', () => {
    for (let i = 1; i < RANK_LADDER.length; i++) {
      expect(RANK_LADDER[i].tier).toBeGreaterThan(RANK_LADDER[i - 1].tier);
    }
    expect(rankByTier(27)?.slug).toBe('tekken_god');
    expect(rankBySlug('tekken_god')?.tier).toBe(27);
  });
});
