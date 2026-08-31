import type { PairViewModel, SortKey, LeaderboardView } from '@/lib/leaderboard';
import type { FormResult } from '@/lib/trends';
import { RankBadge } from './RankBadge';
import { MmrCell } from './MmrCell';
import { PlayerLink } from './PlayerAccent';
import { CharacterName } from './CharacterName';
import { DeltaCell, FormPips } from './Movement';
import { CaretDown } from './glyphs';
import { accentColor } from '@/lib/accent';

/** Everything the board knows about a row beyond the pair itself. */
export interface RowTrend {
  mmrDelta: number | null;
  rankDelta: number | null;
  form: FormResult[];
  games: number;
}

interface Props {
  rows: PairViewModel[];
  view: LeaderboardView;
  sort: SortKey;
  windowDays: number;
  trendByPairId: Map<string, RowTrend>;
  /** History is still in flight — movement cells show a placeholder rather than
   *  an em dash, so "loading" never reads as "no data". */
  trendsLoading: boolean;
  onSortChange: (s: SortKey) => void;
}

function SortHeader({
  label,
  active,
  onClick,
  align = 'left',
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  align?: 'left' | 'right';
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Sort by ${label}`}
      className={`eyebrow inline-flex items-center gap-1 ${
        align === 'right' ? 'flex-row-reverse' : ''
      } ${active ? 'text-fg' : 'hover:text-fg'}`}
    >
      {label}
      {active && <CaretDown size={8} />}
    </button>
  );
}

export function LeaderboardTable({
  rows,
  view,
  sort,
  windowDays,
  trendByPairId,
  trendsLoading,
  onSortChange,
}: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[360px] text-sm">
        <thead>
          <tr className="border-b border-border text-left align-bottom">
            <th className="w-9 pb-1.5 pr-2" />
            <th className="px-2 pb-1.5">
              <span className="eyebrow">Player</span>
            </th>
            <th className="hidden px-2 pb-1.5 sm:table-cell">
              <span className="eyebrow">Character</span>
            </th>
            <th className="px-2 pb-1.5">
              <SortHeader
                label="Rank"
                active={sort === 'rank'}
                onClick={() => onSortChange('rank')}
              />
            </th>
            <th className="px-2 pb-1.5 text-right">
              <SortHeader
                label="MMR"
                align="right"
                active={sort === 'mmr'}
                onClick={() => onSortChange('mmr')}
              />
            </th>
            <th className="px-2 pb-1.5 text-right">
              <SortHeader
                label={`${windowDays}d`}
                align="right"
                active={sort === 'delta'}
                onClick={() => onSortChange('delta')}
              />
            </th>
            <th className="hidden px-2 pb-1.5 sm:table-cell">
              <span className="eyebrow">Form</span>
            </th>
            <th className="hidden pb-1.5 pl-2 text-right sm:table-cell">
              <span
                className="eyebrow"
                title={`Matches played in the last ${windowDays} days`}
              >
                GP
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((p, i) => {
            const pos = i + 1;
            const leader = pos === 1;
            const trend = trendByPairId.get(p.pairId);
            return (
              <tr
                key={p.pairId}
                className={`border-b border-border transition-colors hover:bg-surface-2 ${
                  leader ? 'bg-surface' : ''
                }`}
              >
                {/* Champion emphasis, kept inside the ranking rather than lifted
                    out of it: the leader is still obvious and still comparable. */}
                <td className="py-1.5 pr-2">
                  <span
                    className={`tabular flex h-6 w-7 items-center justify-center text-xs ${
                      leader ? 'bg-fg font-semibold text-bg' : 'text-muted'
                    }`}
                  >
                    {pos}
                  </span>
                </td>
                <td className="px-2 py-1.5">
                  <PlayerLink
                    playerId={p.playerId}
                    tag={p.playerTag}
                    strong={leader}
                    // The identity color only does a job in Pairs view, where one
                    // person holds several rows. In Players view every row is a
                    // different person, so it would carry no information (§5.3).
                    accent={view === 'pairs' ? accentColor(p.playerId) : undefined}
                  />
                </td>
                <td className="hidden whitespace-nowrap px-2 py-1.5 sm:table-cell">
                  <CharacterName
                    slug={p.character}
                    isMain={view === 'pairs' && p.isMain}
                    iconSize={18}
                    nameClassName="hidden md:inline"
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5">
                  <RankBadge
                    rank={p.rank}
                    iconSize={18}
                    labelClassName="hidden sm:inline"
                  />
                </td>
                <td className="px-2 py-1.5 text-right">
                  <MmrCell
                    mmr={p.mmr}
                    provisional={p.provisional}
                    confidence={p.confidence}
                  />
                </td>
                <td className="whitespace-nowrap px-2 py-1.5 text-right">
                  <DeltaCell
                    value={trend?.mmrDelta ?? null}
                    loading={trendsLoading}
                    title={rankMoveTitle(trend?.rankDelta ?? null, windowDays)}
                  />
                </td>
                <td className="hidden whitespace-nowrap px-2 py-1.5 sm:table-cell">
                  <FormPips results={trend?.form ?? []} loading={trendsLoading} />
                </td>
                <td className="tabular hidden py-1.5 pl-2 text-right text-muted sm:table-cell">
                  {trend ? trend.games : ''}
                </td>
              </tr>
            );
          })}
          {rows.length === 0 && (
            <tr>
              <td colSpan={8} className="px-2 py-12 text-center text-muted">
                No qualifying pairs yet — data appears after the first pipeline run.
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {view === 'pairs' && rows.length > 0 && (
        <p className="mt-2 text-xs text-muted">
          The bar on each row marks the player — one person can hold several spots.
        </p>
      )}
    </div>
  );
}

function rankMoveTitle(rankDelta: number | null, days: number): string | undefined {
  if (rankDelta == null || rankDelta === 0) return undefined;
  const n = Math.abs(rankDelta);
  const dir = rankDelta > 0 ? 'up' : 'down';
  return `${n} rank ${n === 1 ? 'tier' : 'tiers'} ${dir} in ${days}d`;
}
