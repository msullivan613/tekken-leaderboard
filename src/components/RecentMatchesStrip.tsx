import { Link } from 'react-router-dom';
import type { Match } from '@/types/data-files';
import { useData } from '@/data/DataProvider';
import { characterDisplayName } from '@/data/characters';
import { formatDate } from '@/lib/format';
import { accentColor } from '@/lib/accent';

function tagOf(playerById: Map<string, { player_tag: string }>, id: string): string {
  return playerById.get(id)?.player_tag ?? id;
}

export function RecentMatchesStrip({ limit = 20 }: { limit?: number }) {
  const { matches, playerById } = useData();
  const recent = (matches?.matches ?? []).slice(-limit).reverse();
  if (recent.length === 0) return null;
  return (
    <section className="mt-8">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-xl">Recent sets</h2>
        <Link to="/matches" className="text-sm">
          All matches →
        </Link>
      </div>
      <ul className="divide-y divide-border rounded-lg border border-border">
        {recent.map((m: Match) => {
          const aWon = m.scoreA > m.scoreB;
          return (
            <li
              key={m.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 px-3 py-2 text-sm"
            >
              <span className="w-20 shrink-0 text-muted">{formatDate(m.date)}</span>
              <span
                className={aWon ? 'font-medium text-fg' : 'text-muted'}
                style={{ borderLeft: `3px solid ${accentColor(m.playerA)}`, paddingLeft: 6 }}
              >
                {tagOf(playerById, m.playerA)}
                {m.charA && (
                  <span className="text-muted"> ({characterDisplayName(m.charA)})</span>
                )}
              </span>
              <span className="font-mono tabular-nums">
                {m.scoreA}–{m.scoreB}
              </span>
              <span
                className={!aWon ? 'font-medium text-fg' : 'text-muted'}
                style={{ borderLeft: `3px solid ${accentColor(m.playerB)}`, paddingLeft: 6 }}
              >
                {tagOf(playerById, m.playerB)}
                {m.charB && (
                  <span className="text-muted"> ({characterDisplayName(m.charB)})</span>
                )}
              </span>
              {m.setting && (
                <span className="ml-auto text-xs uppercase text-muted">{m.setting}</span>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
