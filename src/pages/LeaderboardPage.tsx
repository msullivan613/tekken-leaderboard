import { useMemo, useState } from 'react';
import { useData } from '@/data/DataProvider';
import { config } from '@/config';
import {
  collapseToBestPair,
  sortPairs,
  type LeaderboardView,
  type SortKey,
} from '@/lib/leaderboard';
import { LeaderboardTable } from '@/components/LeaderboardTable';
import { ViewToggle } from '@/components/ViewToggle';
import { RecentMatchesStrip } from '@/components/RecentMatchesStrip';
import { LastUpdated } from '@/components/LastUpdated';

export function LeaderboardPage() {
  const { pairs, lastUpdated, loading, error } = useData();
  const [view, setView] = useState<LeaderboardView>(
    config.leaderboard.defaultView,
  );
  const [sort, setSort] = useState<SortKey>(config.leaderboard.defaultSort);

  const rows = useMemo(() => {
    const base =
      view === 'players'
        ? collapseToBestPair(pairs, config.leaderboard.bestPairMetric)
        : pairs;
    return sortPairs(base, sort);
  }, [pairs, view, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-4xl">C-Town Leaderboard</h1>
          <LastUpdated iso={lastUpdated} />
        </div>
        <ViewToggle value={view} onChange={setView} />
      </div>

      {error ? (
        <p className="rounded-lg border border-border bg-surface p-4 text-muted">
          Couldn&apos;t load roster: {error.message}
        </p>
      ) : loading ? (
        <p className="text-muted">Loading…</p>
      ) : (
        <LeaderboardTable
          rows={rows}
          view={view}
          sort={sort}
          onSortChange={setSort}
        />
      )}

      <RecentMatchesStrip />
    </div>
  );
}
