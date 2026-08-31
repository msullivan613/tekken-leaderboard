// Movement signals for the leaderboard (§5.3): how a pair has moved recently and
// how its player has been doing. All derived in the browser from JSON that the
// pipeline already commits — mmrhistory.json, rankhistory.json, matches.json —
// so nothing here needs a schema or pipeline change.
//
// Every function returns null/empty rather than a zero when the underlying data
// doesn't reach back far enough. A fabricated 0 reads as "no movement", which is
// a different and wrong claim.
import type { HistoryFile, Match } from '@/types/data-files';
import type { CharacterSlug } from '@/types/domain';

export type FormResult = 'W' | 'L';

/** ISO date (YYYY-MM-DD) `days` before now, matching how the pipeline keys
 *  history points. Comparing the keys as strings is safe because they are all
 *  zero-padded ISO dates. */
export function cutoffDate(days: number, now: Date = new Date()): string {
  const d = new Date(now.getTime() - days * 86_400_000);
  return d.toISOString().slice(0, 10);
}

/** Change in a pair's series over the trailing window: latest value minus the
 *  last value recorded at or before the cutoff.
 *
 *  Null when the pair has no series, when the series holds a single point, or
 *  when it doesn't reach back past the cutoff — in all three cases we simply
 *  don't know what the value was `days` ago. */
export function seriesDelta(
  file: HistoryFile | null,
  pairId: string,
  days: number,
  now?: Date,
): number | null {
  const points = file?.series[pairId]?.points;
  if (!points || points.length < 2) return null;

  const cutoff = cutoffDate(days, now);
  const latest = points[points.length - 1]!;

  // Points are written in ascending date order; walk back to the last one at or
  // before the cutoff.
  let baseline: number | null = null;
  for (let i = points.length - 1; i >= 0; i--) {
    const point = points[i]!;
    if (point[0] <= cutoff) {
      baseline = point[1];
      break;
    }
  }
  if (baseline == null) return null;
  return latest[1] - baseline;
}

/** MMR points gained/lost over the window (mmrhistory.json). */
export function mmrDelta(
  file: HistoryFile | null,
  pairId: string,
  days: number,
  now?: Date,
): number | null {
  return seriesDelta(file, pairId, days, now);
}

/** Rank tiers climbed/dropped over the window (rankhistory.json). Values are
 *  tier indices, so a delta of 2 means two promotions. */
export function rankDelta(
  file: HistoryFile | null,
  pairId: string,
  days: number,
  now?: Date,
): number | null {
  return seriesDelta(file, pairId, days, now);
}

/** Did `playerId` win this match? Null when they didn't play in it. */
function outcomeFor(match: Match, playerId: string): FormResult | null {
  const isA = match.a.playerId === playerId;
  const isB = match.b.playerId === playerId;
  if (!isA && !isB) return null;
  // A player can in principle appear on both sides only in malformed data; treat
  // side A as authoritative so the result stays deterministic.
  const wonAsA = match.winner === 'a';
  return (isA ? wonAsA : !wonAsA) ? 'W' : 'L';
}

/** The player's last `n` results, most recent first.
 *
 *  Pass `character` in Pairs view so the form describes that pair rather than
 *  the player as a whole. Reads matches.json, which is already the bounded
 *  recent feed — the cold-storage archives are build-time only and the frontend
 *  never downloads them. */
export function recentForm(
  matches: Match[] | null | undefined,
  playerId: string,
  character?: CharacterSlug | null,
  n = 5,
): FormResult[] {
  if (!matches?.length) return [];
  const mine = matches.filter((m) => {
    if (outcomeFor(m, playerId) == null) return false;
    if (!character) return true;
    const side = m.a.playerId === playerId ? m.a : m.b;
    return side.character === character;
  });
  mine.sort((x, y) => Date.parse(y.playedAt) - Date.parse(x.playedAt));
  return mine.slice(0, n).map((m) => outcomeFor(m, playerId)!);
}

/** How many tracked matches the player has played in the trailing window. */
export function gamesInWindow(
  matches: Match[] | null | undefined,
  playerId: string,
  days: number,
  character?: CharacterSlug | null,
  now: Date = new Date(),
): number {
  if (!matches?.length) return 0;
  const since = now.getTime() - days * 86_400_000;
  let count = 0;
  for (const m of matches) {
    if (outcomeFor(m, playerId) == null) continue;
    if (character) {
      const side = m.a.playerId === playerId ? m.a : m.b;
      if (side.character !== character) continue;
    }
    const t = Date.parse(m.playedAt);
    if (!Number.isNaN(t) && t >= since) count++;
  }
  return count;
}
