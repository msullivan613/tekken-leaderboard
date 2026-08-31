import { useMemo, useState } from 'react';
import { useData, useMatches } from '@/data/DataProvider';
import { concludedAgo, matchTimestamp, matchTypeLabel } from '@/lib/format';
import { MatchSideLabel } from '@/components/MatchSide';
import { MatchScore } from '@/components/MatchScore';
import { Select, ToggleChip } from '@/components/Field';

const MATCH_TYPES = ['quick', 'ranked', 'player', 'group'] as const;

export function MatchesPage() {
  const { players } = useData();
  const matches = useMatches();
  const [player, setPlayer] = useState('');
  const [matchType, setMatchType] = useState('');
  const [crewOnly, setCrewOnly] = useState(false);

  const rows = useMemo(() => {
    let list = [...(matches?.matches ?? [])].sort(
      (a, b) => matchTimestamp(b.playedAt) - matchTimestamp(a.playedAt),
    );
    if (player)
      list = list.filter((m) => m.a.playerId === player || m.b.playerId === player);
    if (matchType) list = list.filter((m) => m.battleType === matchType);
    if (crewOnly) list = list.filter((m) => m.crew);
    return list;
  }, [matches, player, matchType, crewOnly]);

  return (
    <div>
      <div className="border-b border-border pb-3">
        <h1 className="text-3xl sm:text-4xl">Matches</h1>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Gathered automatically — crew rivalries plus everyone&apos;s recent games
          against anyone.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 py-4">
        <Select
          label="Filter by player"
          value={player}
          onChange={(e) => setPlayer(e.target.value)}
        >
          <option value="">All players</option>
          {players.map((p) => (
            <option key={p.id} value={p.id}>
              {p.player_tag}
            </option>
          ))}
        </Select>
        <Select
          label="Filter by match type"
          value={matchType}
          onChange={(e) => setMatchType(e.target.value)}
        >
          <option value="">Any match type</option>
          {MATCH_TYPES.map((t) => (
            <option key={t} value={t}>
              {matchTypeLabel(t)}
            </option>
          ))}
        </Select>
        <ToggleChip checked={crewOnly} onChange={setCrewOnly}>
          Crew vs crew
        </ToggleChip>
        <span className="tabular ml-auto text-xs text-muted">
          {rows.length.toLocaleString()} {rows.length === 1 ? 'match' : 'matches'}
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[620px] text-sm">
          <thead>
            <tr className="border-b border-border text-left">
              <th className="pb-1.5 pr-3">
                <span className="eyebrow">When</span>
              </th>
              <th className="px-3 pb-1.5 text-right">
                <span className="eyebrow">Player</span>
              </th>
              <th className="px-3 pb-1.5 text-center">
                <span className="eyebrow">Rounds</span>
              </th>
              <th className="px-3 pb-1.5">
                <span className="eyebrow">Opponent</span>
              </th>
              <th className="pb-1.5 pl-3">
                <span className="eyebrow">Type</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const aWon = m.winner === 'a';
              return (
                <tr key={m.id} className="border-b border-border hover:bg-surface-2">
                  <td
                    className="whitespace-nowrap py-2 pr-3 text-muted"
                    title={m.playedAt}
                  >
                    {concludedAgo(m.playedAt)}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end">
                      <MatchSideLabel side={m.a} align="right" won={aWon} iconSize={18} />
                    </div>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <MatchScore
                      roundsA={m.roundsA}
                      roundsB={m.roundsB}
                      winner={m.winner}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <MatchSideLabel side={m.b} align="left" won={!aWon} iconSize={18} />
                  </td>
                  <td className="whitespace-nowrap py-2 pl-3 text-muted">
                    {matchTypeLabel(m.battleType)}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-3 py-12 text-center text-muted">
                  No matches for those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
