import { useMemo, useState } from 'react';
import { useData, useHistory, useMatches } from '@/data/DataProvider';
import { config } from '@/config';
import {
  collapseToBestPair,
  sortPairs,
  type LeaderboardView,
  type SortKey,
} from '@/lib/leaderboard';
import { gamesInWindow, mmrDelta, rankDelta, recentForm } from '@/lib/trends';
import { LeaderboardTable, type RowTrend } from '@/components/LeaderboardTable';
import { SegmentedControl } from '@/components/SegmentedControl';
import { RecentMatchesStrip } from '@/components/RecentMatchesStrip';
import { LastUpdated } from '@/components/LastUpdated';

/** Trailing window for the movement columns. Tied to the matches feed window so
 *  the columns agree with each other: a player showing recent form must also
 *  show the games those results came from. */
const WINDOW_DAYS = config.matches.recentWindowDays;

const VIEWS = [
  { value: 'players', label: 'Players' },
  { value: 'pairs', label: 'Pairs' },
] as const;

export function LeaderboardPage() {
  const { pairs, players, lastUpdated, loading, error } = useData();
  const [view, setView] = useState<LeaderboardView>(config.leaderboard.defaultView);
  const [sort, setSort] = useState<SortKey>(config.leaderboard.defaultSort);

  // Movement data loads lazily and the board never waits on it (§5.2).
  const history = useHistory();
  const matches = useMatches();
  const trendsLoading = history.mmr == null && matches == null;

  const base = useMemo(
    () =>
      view === 'players'
        ? collapseToBestPair(pairs, config.leaderboard.bestPairMetric)
        : pairs,
    [pairs, view],
  );

  const trendByPairId = useMemo(() => {
    const feed = matches?.matches ?? [];
    const out = new Map<string, RowTrend>();
    for (const p of base) {
      // In Players view a row stands for the whole person, so their form counts
      // every character; in Pairs view it is scoped to that pair's character.
      const character = view === 'pairs' ? p.character : null;
      out.set(p.pairId, {
        mmrDelta: mmrDelta(history.mmr, p.pairId, WINDOW_DAYS),
        rankDelta: rankDelta(history.rank, p.pairId, WINDOW_DAYS),
        form: recentForm(feed, p.playerId, character),
        games: gamesInWindow(feed, p.playerId, WINDOW_DAYS, character),
      });
    }
    return out;
  }, [base, view, history.mmr, history.rank, matches]);

  const rows = useMemo(() => {
    if (sort !== 'delta') return sortPairs(base, sort);
    // Delta isn't on the pair model — it's derived here — so this sort lives with
    // the data rather than in sortPairs. Unknown movement sorts last.
    return [...base].sort((a, b) => {
      const av = trendByPairId.get(a.pairId)?.mmrDelta;
      const bv = trendByPairId.get(b.pairId)?.mmrDelta;
      if (av == null && bv == null) return 0;
      if (av == null) return 1;
      if (bv == null) return -1;
      return bv - av;
    });
  }, [base, sort, trendByPairId]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-x-4 gap-y-2 border-b border-border pb-3">
        <div>
          <h1 className="text-3xl sm:text-4xl">Standings</h1>
          <p className="mt-1 text-sm text-muted">
            {players.length} {players.length === 1 ? 'player' : 'players'}
            {lastUpdated && ' · '}
            <LastUpdated iso={lastUpdated} />
          </p>
        </div>
        <SegmentedControl
          label="Leaderboard view"
          value={view}
          options={VIEWS}
          onChange={setView}
        />
      </div>

      {error ? (
        <p className="border border-border bg-surface p-4 text-muted">
          Couldn&apos;t load the roster: {error.message}
        </p>
      ) : loading ? (
        <p className="py-10 text-center text-muted">Loading the board…</p>
      ) : (
        <LeaderboardTable
          rows={rows}
          view={view}
          sort={sort}
          windowDays={WINDOW_DAYS}
          trendByPairId={trendByPairId}
          trendsLoading={trendsLoading}
          onSortChange={setSort}
        />
      )}

      <RecentMatchesStrip />
    </div>
  );
}
