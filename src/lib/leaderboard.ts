// Client-side join: players.json ⨝ ranks.json ⨝ glicko.json → one PairViewModel
// per qualifying pair (§5.2/§5.4), plus the Players⇄Pairs collapse and sorting.
import type {
  GlickoFile,
  RanksFile,
  PlayersFile,
  RankPair,
  GlickoPair,
} from '@/types/data-files';
import type { CharacterSlug, Platform, Player, WavuConfidence } from '@/types/domain';
import { rankBySlug, rankByTier, type RankTier } from '@/data/ranks';

export interface PairViewModel {
  pairId: string;
  playerId: string;
  playerTag: string;
  character: CharacterSlug;
  isMain: boolean;
  rank: RankTier | null;
  rankedGames: number;
  mmr: number | null;
  sigmaSquared: number | null;
  confidence: WavuConfidence | null;
  provisional: boolean;
  platform: Platform;
  peakRank: RankTier | null; // player-level rollup (§2.4)
  region: string | null;
  lastSeen: string | null;
  mmrUpdated: string | null;
}

export type SortKey = 'rank' | 'mmr';
export type LeaderboardView = 'players' | 'pairs';

/** A player's effective main character: the hand-set `players.json`
 *  `main_character` when present, else the player's highest dan-ranked character
 *  from ranks.json (issue #1). Ties break on more ranked games, then character
 *  slug for determinism. Null when the player has neither a set main nor any
 *  ranked character yet. */
function resolveMain(player: Player, ranks: RankPair[]): CharacterSlug | null {
  if (player.main_character) return player.main_character;
  let best: RankPair | null = null;
  for (const r of ranks) {
    if (r.rankTier == null) continue;
    if (best == null || isHigherRanked(r, best)) best = r;
  }
  return best?.character ?? null;
}

function isHigherRanked(a: RankPair, b: RankPair): boolean {
  const at = a.rankTier ?? -1;
  const bt = b.rankTier ?? -1;
  if (at !== bt) return at > bt;
  if (a.rankedGames !== b.rankedGames) return a.rankedGames > b.rankedGames;
  return a.character < b.character;
}

/** Resolve every player's effective main (see resolveMain), keyed by player id.
 *  Exposed through DataProvider so the UI can render a main even when
 *  `main_character` is null in players.json. */
export function resolveMainCharacters(
  playersFile: PlayersFile | null,
  ranksFile: RanksFile | null,
): Map<string, CharacterSlug | null> {
  const out = new Map<string, CharacterSlug | null>();
  if (!playersFile) return out;
  const ranksByPlayer = groupRanksByPlayer(ranksFile);
  for (const p of playersFile.players) {
    out.set(p.id, resolveMain(p, ranksByPlayer.get(p.id) ?? []));
  }
  return out;
}

function groupRanksByPlayer(ranksFile: RanksFile | null): Map<string, RankPair[]> {
  const byPlayer = new Map<string, RankPair[]>();
  for (const r of ranksFile?.pairs ?? []) {
    const list = byPlayer.get(r.playerId) ?? [];
    list.push(r);
    byPlayer.set(r.playerId, list);
  }
  return byPlayer;
}

function highestTier(slugs: Array<string | null>): number | null {
  let best: number | null = null;
  for (const slug of slugs) {
    const t = rankBySlug(slug)?.tier ?? null;
    if (t != null && (best == null || t > best)) best = t;
  }
  return best;
}

/** Player-level peak = max tier across the player's pair peaks, floored by the
 *  hand-set players.json peak_rank (§2.4). */
function computePlayerPeaks(
  players: Player[],
  ranksByPlayer: Map<string, RankPair[]>,
): Map<string, RankTier | null> {
  const out = new Map<string, RankTier | null>();
  for (const p of players) {
    const pairPeaks = (ranksByPlayer.get(p.id) ?? []).map((r) => r.characterPeakRank);
    const tier = highestTier([...pairPeaks, p.peak_rank]);
    out.set(p.id, rankByTier(tier));
  }
  return out;
}

export function buildPairViewModels(
  playersFile: PlayersFile | null,
  ranksFile: RanksFile | null,
  glickoFile: GlickoFile | null,
): PairViewModel[] {
  if (!playersFile) return [];
  const players = playersFile.players;
  const playerById = new Map(players.map((p) => [p.id, p]));

  const rankByPairId = new Map<string, RankPair>();
  for (const r of ranksFile?.pairs ?? []) rankByPairId.set(r.pairId, r);
  const ranksByPlayer = groupRanksByPlayer(ranksFile);

  const mainByPlayer = new Map<string, CharacterSlug | null>();
  for (const p of players) mainByPlayer.set(p.id, resolveMain(p, ranksByPlayer.get(p.id) ?? []));

  const glickoByPairId = new Map<string, GlickoPair>();
  for (const g of glickoFile?.pairs ?? []) glickoByPairId.set(g.pairId, g);

  const playerPeaks = computePlayerPeaks(players, ranksByPlayer);

  // Union of pair ids seen in either source.
  const pairIds = new Set<string>([...rankByPairId.keys(), ...glickoByPairId.keys()]);

  const models: PairViewModel[] = [];
  for (const pairId of pairIds) {
    const rank = rankByPairId.get(pairId) ?? null;
    const glicko = glickoByPairId.get(pairId) ?? null;
    const playerId = rank?.playerId ?? glicko?.playerId;
    const character = (rank?.character ?? glicko?.character) as CharacterSlug | undefined;
    if (!playerId || !character) continue;
    const player = playerById.get(playerId);
    if (!player) continue; // pair for an unknown player id — skip

    models.push({
      pairId,
      playerId,
      playerTag: player.player_tag,
      character,
      isMain: character === mainByPlayer.get(playerId),
      rank: rankBySlug(rank?.rank ?? null),
      rankedGames: rank?.rankedGames ?? 0,
      mmr: glicko?.rating ?? null,
      sigmaSquared: glicko?.sigmaSquared ?? null,
      confidence: glicko?.confidence ?? null,
      provisional: glicko?.provisional ?? false,
      platform: player.platform,
      peakRank: playerPeaks.get(playerId) ?? null,
      region: rank?.region ?? null,
      lastSeen: rank?.lastSeen ?? null,
      mmrUpdated: glicko?.lastUpdated ?? null,
    });
  }
  return models;
}

function rankTierOf(p: PairViewModel): number {
  return p.rank?.tier ?? -1;
}
function mmrOf(p: PairViewModel): number {
  return p.mmr ?? -1;
}

/** Sort a list of pairs by the active signal, with the other as tiebreak (§5.3). */
export function sortPairs(pairs: PairViewModel[], sort: SortKey): PairViewModel[] {
  const copy = [...pairs];
  copy.sort((a, b) => {
    if (sort === 'rank') {
      return rankTierOf(b) - rankTierOf(a) || mmrOf(b) - mmrOf(a);
    }
    return mmrOf(b) - mmrOf(a) || rankTierOf(b) - rankTierOf(a);
  });
  return copy;
}

/** Players view: collapse to each player's best pair (§5.3). Best = highest MMR
 *  (config bestPairMetric), falling back to highest rank tier when no MMR. */
export function collapseToBestPair(
  pairs: PairViewModel[],
  metric: 'mmr' | 'rank',
): PairViewModel[] {
  const bestByPlayer = new Map<string, PairViewModel>();
  for (const p of pairs) {
    const cur = bestByPlayer.get(p.playerId);
    if (!cur) {
      bestByPlayer.set(p.playerId, p);
      continue;
    }
    if (isBetter(p, cur, metric)) bestByPlayer.set(p.playerId, p);
  }
  return [...bestByPlayer.values()];
}

function isBetter(a: PairViewModel, b: PairViewModel, metric: 'mmr' | 'rank'): boolean {
  if (metric === 'mmr') {
    const am = a.mmr;
    const bm = b.mmr;
    if (am != null || bm != null) {
      if ((am ?? -1) !== (bm ?? -1)) return (am ?? -1) > (bm ?? -1);
    }
    // both null MMR → fall back to rank tier
    return rankTierOf(a) > rankTierOf(b);
  }
  if (rankTierOf(a) !== rankTierOf(b)) return rankTierOf(a) > rankTierOf(b);
  return mmrOf(a) > mmrOf(b);
}

export function pairsForPlayer(
  pairs: PairViewModel[],
  playerId: string,
): PairViewModel[] {
  return sortPairs(
    pairs.filter((p) => p.playerId === playerId),
    'mmr',
  );
}
