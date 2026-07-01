// Read helpers for stats.json keys (§2.9). Keys are ordered so idA < idB
// lexicographically; these normalize lookups from the caller's perspective.
import type { StatsFile, HeadToHeadRecord } from '@/types/data-files';

export interface DirectedH2H {
  games: number; // games `me` won
  oppGames: number; // games opponent won
  sets: number; // sets `me` won
  oppSets: number;
}

export function h2hKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** Head-to-head from `me`'s perspective vs `opp`, or null if never played. */
export function directedH2H(
  stats: StatsFile | null,
  me: string,
  opp: string,
): DirectedH2H | null {
  if (!stats) return null;
  const rec = stats.headToHead[h2hKey(me, opp)];
  if (!rec) return null;
  const meIsA = me < opp;
  return meIsA
    ? { games: rec.gamesA, oppGames: rec.gamesB, sets: rec.setsA, oppSets: rec.setsB }
    : { games: rec.gamesB, oppGames: rec.gamesA, sets: rec.setsB, oppSets: rec.setsA };
}

export function rawH2H(
  stats: StatsFile | null,
  a: string,
  b: string,
): HeadToHeadRecord | null {
  if (!stats) return null;
  return stats.headToHead[h2hKey(a, b)] ?? null;
}
