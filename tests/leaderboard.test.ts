import { describe, it, expect } from 'vitest';
import { resolveMainCharacters, buildPairViewModels } from '@/lib/leaderboard';
import type { PlayersFile, RanksFile, RankPair } from '@/types/data-files';
import type { Player } from '@/types/domain';
import { makePairId } from '@/types/domain';

function player(o: Partial<Player> & Pick<Player, 'id'>): Player {
  return {
    tekken_id: o.id,
    player_tag: o.id,
    platform: 'steam',
    main_character: null,
    peak_rank: null,
    ...o,
  };
}

function rankPair(
  playerId: string,
  character: string,
  rankTier: number | null,
  rankedGames = 0,
): RankPair {
  return {
    pairId: makePairId(playerId, character),
    playerId,
    tekken_id: playerId,
    character,
    rank: null,
    rankTier,
    rankedGames,
    region: null,
    characterPeakRank: null,
    lastSeen: null,
  };
}

function playersFile(players: Player[]): PlayersFile {
  return { schemaVersion: 1, players };
}

function ranksFile(pairs: RankPair[]): RanksFile {
  return { schemaVersion: 1, source: 'tknow', generatedAt: '2026-07-01T00:00:00Z', pairs };
}

describe('resolveMainCharacters (issue #1)', () => {
  it('keeps a hand-set main_character even when ranks disagree', () => {
    const pf = playersFile([player({ id: 'a', main_character: 'jin' })]);
    const rf = ranksFile([rankPair('a', 'kazuya', 30)]);
    expect(resolveMainCharacters(pf, rf).get('a')).toBe('jin');
  });

  it('derives the highest dan-ranked character when main_character is null', () => {
    const pf = playersFile([player({ id: 'a', main_character: null })]);
    const rf = ranksFile([
      rankPair('a', 'lili', 15),
      rankPair('a', 'dragunov', 22),
      rankPair('a', 'reina', 18),
    ]);
    expect(resolveMainCharacters(pf, rf).get('a')).toBe('dragunov');
  });

  it('breaks rank ties on ranked games, then slug', () => {
    const pf = playersFile([player({ id: 'a' }), player({ id: 'b' })]);
    const rf = ranksFile([
      rankPair('a', 'lili', 20, 10),
      rankPair('a', 'nina', 20, 40), // same tier, more games → wins
      // b: same tier and games → slug tiebreak (asuka < zafina)
      rankPair('b', 'zafina', 20, 5),
      rankPair('b', 'asuka', 20, 5),
    ]);
    const mains = resolveMainCharacters(pf, rf);
    expect(mains.get('a')).toBe('nina');
    expect(mains.get('b')).toBe('asuka');
  });

  it('is null when a null-main player has no ranked characters', () => {
    const pf = playersFile([player({ id: 'a', main_character: null })]);
    expect(resolveMainCharacters(pf, ranksFile([])).get('a')).toBeNull();
    // rankTier null (unranked) does not count as a main
    const rf = ranksFile([rankPair('a', 'jin', null, 12)]);
    expect(resolveMainCharacters(pf, rf).get('a')).toBeNull();
  });

  it('marks the derived main as isMain in the pair view models', () => {
    const pf = playersFile([player({ id: 'a', main_character: null })]);
    const rf = ranksFile([rankPair('a', 'lili', 12), rankPair('a', 'dragunov', 22)]);
    const models = buildPairViewModels(pf, rf, null);
    expect(models.find((m) => m.character === 'dragunov')?.isMain).toBe(true);
    expect(models.find((m) => m.character === 'lili')?.isMain).toBe(false);
  });
});
