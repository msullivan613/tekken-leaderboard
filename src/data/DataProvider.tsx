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

export interface DataContextValue {
  loading: boolean;
  error: Error | null;
  lastUpdated: string | null;
  players: Player[];
  playerById: Map<string, Player>;
  /** Effective main character per player id, deriving null mains from ranks (§1). */
  mainCharacterByPlayer: Map<string, CharacterSlug | null>;
  pairs: PairViewModel[];
  matches: MatchesFile | null;
  stats: StatsFile | null;
  history: { rank: HistoryFile | null; mmr: HistoryFile | null };
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
  const matchesQ = useJson<MatchesFile>('matches.json');
  const statsQ = useJson<StatsFile>('stats.json');
  const rankHistoryQ = useJson<HistoryFile>('rankhistory.json');
  const mmrHistoryQ = useJson<HistoryFile>('mmrhistory.json');

  const value = useMemo<DataContextValue>(() => {
    const players = playersQ.data?.players ?? [];
    const pairs = buildPairViewModels(playersQ.data, ranksQ.data, glickoQ.data);
    // players.json is required; the rest degrade gracefully to nulls/empties.
    const loading = playersQ.loading;
    const error = playersQ.error;
    const lastUpdated = maxTimestamp([
      ranksQ.data?.generatedAt,
      glickoQ.data?.generatedAt,
      matchesQ.data?.generatedAt,
      statsQ.data?.generatedAt,
    ]);
    return {
      loading,
      error,
      lastUpdated,
      players,
      playerById: new Map(players.map((p) => [p.id, p])),
      mainCharacterByPlayer: resolveMainCharacters(playersQ.data, ranksQ.data),
      pairs,
      matches: matchesQ.data,
      stats: statsQ.data,
      history: { rank: rankHistoryQ.data, mmr: mmrHistoryQ.data },
    };
  }, [
    playersQ.data,
    playersQ.loading,
    playersQ.error,
    ranksQ.data,
    glickoQ.data,
    matchesQ.data,
    statsQ.data,
    rankHistoryQ.data,
    mmrHistoryQ.data,
  ]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within <DataProvider>');
  return ctx;
}
