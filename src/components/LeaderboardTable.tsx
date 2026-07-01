import type { PairViewModel, SortKey, LeaderboardView } from '@/lib/leaderboard';
import { RankBadge } from './RankBadge';
import { MmrCell } from './MmrCell';
import { PlayerLink } from './PlayerAccent';
import { CharacterName } from './CharacterName';
import { platformIcon, platformLabel } from '@/lib/format';
import { useData } from '@/data/DataProvider';

interface Props {
  rows: PairViewModel[];
  view: LeaderboardView;
  sort: SortKey;
  onSortChange: (s: SortKey) => void;
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1 ${
        active ? 'text-fg' : 'text-muted hover:text-fg'
      }`}
    >
      {label}
      {active && <span aria-hidden>▾</span>}
    </button>
  );
}

export function LeaderboardTable({ rows, view, sort, onSortChange }: Props) {
  const { playerById } = useData();
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-surface-2 text-left text-xs uppercase tracking-wide text-muted">
            <th className="w-12 px-3 py-2">#</th>
            <th className="px-3 py-2">Player</th>
            <th className="px-3 py-2">Character</th>
            <th className="px-3 py-2">
              <SortHeader
                label="Rank"
                active={sort === 'rank'}
                onClick={() => onSortChange('rank')}
              />
            </th>
            <th className="px-3 py-2">
              <SortHeader
                label="MMR"
                active={sort === 'mmr'}
                onClick={() => onSortChange('mmr')}
              />
            </th>
            <th className="px-3 py-2">Main</th>
            <th className="px-3 py-2">Peak</th>
            <th className="px-3 py-2">Platform</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const player = playerById.get(p.playerId);
            return (
              <tr
                key={p.pairId}
                className="border-t border-border hover:bg-surface/60"
              >
                <td className="px-3 py-2 font-display text-lg text-muted">{i + 1}</td>
                <td className="px-3 py-2">
                  <PlayerLink playerId={p.playerId} tag={p.playerTag} />
                </td>
                <td className="px-3 py-2">
                  <CharacterName slug={p.character} isMain={p.isMain} />
                </td>
                <td className="px-3 py-2">
                  <RankBadge rank={p.rank} />
                </td>
                <td className="px-3 py-2">
                  <MmrCell
                    mmr={p.mmr}
                    provisional={p.provisional}
                    confidence={p.confidence}
                  />
                </td>
                <td className="px-3 py-2 text-muted">
                  <CharacterName slug={player?.main_character ?? null} />
                </td>
                <td className="px-3 py-2">
                  <RankBadge rank={p.peakRank} />
                </td>
                <td className="px-3 py-2" title={platformLabel(p.platform)}>
                  <span aria-hidden>{platformIcon(p.platform)}</span>
                  <span className="sr-only">{platformLabel(p.platform)}</span>
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-8 text-center text-muted">
                No qualifying pairs yet — data will appear after the first pipeline
                run.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {view === 'pairs' && (
        <p className="px-3 py-2 text-xs text-muted">
          Rows sharing a color belong to the same player.
        </p>
      )}
    </div>
  );
}
