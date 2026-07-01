// Derive stats.json from matches.json (spec §4.4). Counted by individual GAMES:
// a 3–1 set contributes 3 wins + 1 loss. Pure + unit-tested.
import type {
  CharMatchupRecord,
  HeadToHeadRecord,
  Match,
  PlayerStats,
  StatsFile,
} from '@/types/data-files';

function round3(n: number): number {
  return Math.round(n * 1000) / 1000;
}

function emptyPlayer(): PlayerStats {
  return {
    totalGames: 0,
    gameWins: 0,
    gameLosses: 0,
    gameWinRate: 0,
    totalSets: 0,
    setWins: 0,
    setLosses: 0,
    charUsage: {},
    mostPlayedCharacter: null,
  };
}

export function deriveStats(matches: Match[], generatedAt: string): StatsFile {
  const headToHead: Record<string, HeadToHeadRecord> = {};
  const players: Record<string, PlayerStats> = {};
  const charMatchups: Record<string, CharMatchupRecord> = {};

  const ensurePlayer = (id: string): PlayerStats => (players[id] ??= emptyPlayer());

  for (const m of matches) {
    const { playerA, playerB, scoreA, scoreB } = m;

    // ── head-to-head (person vs person), key ordered idA < idB ──────────────
    const [lo, hi] = playerA < playerB ? [playerA, playerB] : [playerB, playerA];
    const key = `${lo}|${hi}`;
    const h2h = (headToHead[key] ??= { gamesA: 0, gamesB: 0, setsA: 0, setsB: 0 });
    const loScore = lo === playerA ? scoreA : scoreB;
    const hiScore = hi === playerA ? scoreA : scoreB;
    h2h.gamesA += loScore;
    h2h.gamesB += hiScore;
    if (loScore > hiScore) h2h.setsA += 1;
    else if (hiScore > loScore) h2h.setsB += 1;

    // ── per-player rollups ──────────────────────────────────────────────────
    const pa = ensurePlayer(playerA);
    const pb = ensurePlayer(playerB);
    pa.gameWins += scoreA;
    pa.gameLosses += scoreB;
    pb.gameWins += scoreB;
    pb.gameLosses += scoreA;
    const games = scoreA + scoreB;
    if (scoreA > scoreB) {
      pa.setWins += 1;
      pb.setLosses += 1;
    } else if (scoreB > scoreA) {
      pb.setWins += 1;
      pa.setLosses += 1;
    }
    if (m.charA) pa.charUsage[m.charA] = (pa.charUsage[m.charA] ?? 0) + games;
    if (m.charB) pb.charUsage[m.charB] = (pb.charUsage[m.charB] ?? 0) + games;

    // ── optional per-character matchup (§2.9), keyed by "id:char" tokens ─────
    if (m.charA && m.charB) {
      const tokA = `${playerA}:${m.charA}`;
      const tokB = `${playerB}:${m.charB}`;
      const [tlo, thi] = tokA < tokB ? [tokA, tokB] : [tokB, tokA];
      const ck = `${tlo}|${thi}`;
      const rec = (charMatchups[ck] ??= { gamesA: 0, gamesB: 0 });
      rec.gamesA += tlo === tokA ? scoreA : scoreB;
      rec.gamesB += thi === tokA ? scoreA : scoreB;
    }
  }

  // finalize per-player derived fields
  for (const p of Object.values(players)) {
    p.totalGames = p.gameWins + p.gameLosses;
    p.totalSets = p.setWins + p.setLosses;
    p.gameWinRate = p.totalGames ? round3(p.gameWins / p.totalGames) : 0;
    let best: string | null = null;
    let bestN = -1;
    for (const [char, n] of Object.entries(p.charUsage)) {
      if (n > bestN) {
        best = char;
        bestN = n;
      }
    }
    p.mostPlayedCharacter = best;
  }

  return {
    schemaVersion: 1,
    generatedAt,
    basedOnMatchCount: matches.length,
    headToHead,
    players,
    charMatchups,
  };
}
