import { Link } from 'react-router-dom';
import type { Match } from '@/types/data-files';
import { useMatches } from '@/data/DataProvider';
import { concludedAgo, matchTimestamp, matchTypeLabel } from '@/lib/format';
import { MatchSideLabel } from './MatchSide';
import { MatchScore } from './MatchScore';
import { ArrowRight } from './glyphs';

// P1 on the left, P2 on the right, the score in the seam between them. Opponents
// may be non-crew randoms.
export function RecentMatchesStrip({ limit = 12 }: { limit?: number }) {
  const matches = useMatches();
  const recent = [...(matches?.matches ?? [])]
    .sort((a, b) => matchTimestamp(b.playedAt) - matchTimestamp(a.playedAt))
    .slice(0, limit);
  if (recent.length === 0) return null;
  return (
    <section className="mt-12">
      <div className="mb-3 flex items-baseline justify-between gap-4 border-b border-border pb-2">
        <h2 className="text-xl">Recent matches</h2>
        <Link to="/matches" className="link inline-flex items-center gap-1.5 text-xs">
          All matches
          <ArrowRight />
        </Link>
      </div>
      <ul>
        {recent.map((m: Match) => {
          const aWon = m.winner === 'a';
          return (
            <li
              key={m.id}
              className="grid grid-cols-[1fr_auto_1fr] items-center gap-3 border-b border-border py-2 text-sm sm:gap-5"
            >
              <div className="justify-self-end">
                <MatchSideLabel side={m.a} align="right" won={aWon} />
              </div>

              <div className="flex flex-col items-center gap-1">
                <MatchScore roundsA={m.roundsA} roundsB={m.roundsB} winner={m.winner} />
                <span className="text-[10px] text-muted" title={m.playedAt}>
                  {concludedAgo(m.playedAt)}
                  {m.battleType ? ` · ${matchTypeLabel(m.battleType)}` : ''}
                </span>
              </div>

              <div className="justify-self-start">
                <MatchSideLabel side={m.b} align="left" won={!aWon} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
