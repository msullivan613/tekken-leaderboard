import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useJson } from './useJson';
import {
  buildPairViewModels,
  resolveMainCharacters,
  type PairViewModel,
} from '@/lib/leaderboard';
import type {
  GlickoFile,
  HistoryFile,
  MatchesFile,
  PlayersFile,
  RanksFile,
  StatsFile,
} from '@/types/data-files';
import type { CharacterSlug, Player } from '@/types/domain';

// The context holds only the "core" light files (players/ranks/glicko) that
// power the leaderboard + nav app-wide. Heavy files (matches, stats, history)
// load lazily from the pages that consume them — see useMatches/useStats/
// useHistory below (issue #18).
export interface DataContextValue {
  loading: boolean;
  error: Error | null;
  lastUpdated: string | null;
  players: Player[];
  playerById: Map<string, Player>;
  /** Effective main character per player id, deriving null mains from ranks (§1). */
  mainCharacterByPlayer: Map<string, CharacterSlug | null>;
  pairs: PairViewModel[];
}

const DataContext = createContext<DataContextValue | null>(null);

function maxTimestamp(values: Array<string | null | undefined>): string | null {
  let max: string | null = null;
  for (const v of values) {
    if (v && (max == null || v > max)) max = v;
  }
  return max;
}

export function DataProvider({ children }: { children: ReactNode }) {
  const playersQ = useJson<PlayersFile>('players.json');
  const ranksQ = useJson<RanksFile>('ranks.json');
  const glickoQ = useJson<GlickoFile>('glicko.json');

  const value = useMemo<DataContextValue>(() => {
    const players = playersQ.data?.players ?? [];
    const pairs = buildPairViewModels(playersQ.data, ranksQ.data, glickoQ.data);
    // players.json is required; the rest degrade gracefully to nulls/empties.
    const loading = playersQ.loading;
    const error = playersQ.error;
    // The leaderboard's "last updated" reflects the core files it renders; the
    // pipeline stamps every file in the same run, so ranks/glicko suffice.
    const lastUpdated = maxTimestamp([
      ranksQ.data?.generatedAt,
      glickoQ.data?.generatedAt,
    ]);
    return {
      loading,
      error,
      lastUpdated,
      players,
      playerById: new Map(players.map((p) => [p.id, p])),
      mainCharacterByPlayer: resolveMainCharacters(playersQ.data, ranksQ.data),
      pairs,
    };
  }, [
    playersQ.data,
    playersQ.loading,
    playersQ.error,
    ranksQ.data,
    glickoQ.data,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within <DataProvider>');
  return ctx;
}

// ── Lazy per-file hooks (issue #18) ──────────────────────────────────────────
// Heavy data files fetch on demand from the pages/components that consume them,
// deduped + cached across navigations by the shared useJson cache. They keep the
// graceful-degradation contract: null until loaded, and null on error.

/** Matches feed — Matches, Profile, Head-to-Head, and the home Recent strip. */
export function useMatches(): MatchesFile | null {
  return useJson<MatchesFile>('matches.json').data;
}

/** Derived per-player + head-to-head stats — Profile and Head-to-Head. */
export function useStats(): StatsFile | null {
  return useJson<StatsFile>('stats.json').data;
}

/** Rank + MMR history for the profile charts — Profile only. */
export function useHistory(): { rank: HistoryFile | null; mmr: HistoryFile | null } {
  const rank = useJson<HistoryFile>('rankhistory.json').data;
  const mmr = useJson<HistoryFile>('mmrhistory.json').data;
  return { rank, mmr };
}
