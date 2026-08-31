import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { config } from '@/config';
import { useData, useMatches, useStats, useHistory } from '@/data/DataProvider';
import { pairsForPlayer } from '@/lib/leaderboard';
import { directedH2H } from '@/lib/stats';
import { PlayerAccent } from '@/components/PlayerAccent';
import { RankBadge } from '@/components/RankBadge';
import { MmrCell } from '@/components/MmrCell';
import { CharacterName } from '@/components/CharacterName';
import { CharacterIcon } from '@/components/icons';
import { HistoryChart } from '@/components/HistoryChart';
import { MatchSideLabel } from '@/components/MatchSide';
import { SegmentedControl } from '@/components/SegmentedControl';
import { FormPips } from '@/components/Movement';
import { recentForm } from '@/lib/trends';
import {
  EMPTY,
  concludedAgo,
  formatDate,
  formatPercent,
  matchTimestamp,
  platformLabel,
} from '@/lib/format';
import { characterDisplayName } from '@/data/characters';
import { rankBySlug } from '@/data/ranks';

const CHART_MODES = [
  { value: 'mmr', label: 'MMR' },
  { value: 'rank', label: 'Rank' },
] as const;

export function PlayerProfilePage() {
  const { id = '' } = useParams();
  const { playerById, mainCharacterByPlayer, players, pairs } = useData();
  const stats = useStats();
  const history = useHistory();
  const matches = useMatches();
  const player = playerById.get(id);
  const mainCharacter = mainCharacterByPlayer.get(id) ?? null;
  const [chartMode, setChartMode] = useState<'mmr' | 'rank'>('mmr');

  const myPairs = useMemo(() => pairsForPlayer(pairs, id), [pairs, id]);
  const pairIds = myPairs.map((p) => p.pairId);
  const myStats = stats?.players[id];

  const myMatches = useMemo(
    () =>
      (matches?.matches ?? [])
        .filter((m) => m.a.playerId === id || m.b.playerId === id)
        .sort((x, y) => matchTimestamp(y.playedAt) - matchTimestamp(x.playedAt))
        .slice(0, 15),
    [matches, id],
  );

  const form = useMemo(() => recentForm(matches?.matches, id, null, 5), [matches, id]);

  // Opponents this player has actually played, most-played first. The old table
  // listed every roster member including never-played ones, so real rivalries
  // were buried in a column of em dashes.
  const opponents = useMemo(() => {
    const rows = players
      .filter((o) => o.id !== id)
      .map((o) => ({ opp: o, rec: directedH2H(stats, id, o.id) }));
    const played = rows.filter((r) => r.rec);
    played.sort(
      (x, y) => y.rec!.matches + y.rec!.oppMatches - (x.rec!.matches + x.rec!.oppMatches),
    );
    return { played, unplayed: rows.filter((r) => !r.rec).map((r) => r.opp) };
  }, [players, stats, id]);

  if (!player) {
    return (
      <div className="py-10">
        <p className="text-muted">No player “{id}”.</p>
        <Link to="/" className="link">
          Back to the standings
        </Link>
      </div>
    );
  }

  const peakRank = myPairs[0]?.peakRank ?? rankBySlug(player.peak_rank);
  const best = myPairs[0];

  return (
    <div className="space-y-10">
      {/* Tale of the tape */}
      <header>
        <div className="flex flex-wrap items-center gap-4 border-b border-border pb-4">
          <PlayerAccent playerId={player.id} tag={player.player_tag} size={64} ring />
          <div className="min-w-0">
            <h1 className="text-3xl leading-none sm:text-4xl">{player.player_tag}</h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
              <span>{platformLabel(player.platform)}</span>
              {mainCharacter && (
                <span className="inline-flex items-center gap-1.5">
                  <CharacterIcon slug={mainCharacter} size={18} />
                  <span className="text-fg">{characterDisplayName(mainCharacter)}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        <dl className="grid grid-cols-2 divide-x divide-border border-b border-border sm:grid-cols-5">
          <Figure label="Rank">
            {best?.rank ? <RankBadge rank={best.rank} iconSize={20} /> : EMPTY}
          </Figure>
          <Figure label="MMR">
            <span className="tabular text-2xl font-semibold leading-none">
              {best ? <MmrCell mmr={best.mmr} provisional={best.provisional} /> : EMPTY}
            </span>
          </Figure>
          <Figure label="Record">
            <span className="tabular text-2xl font-semibold leading-none">
              {myStats ? `${myStats.matchWins}–${myStats.matchLosses}` : EMPTY}
            </span>
          </Figure>
          <Figure label="Win rate">
            <span className="tabular text-2xl font-semibold leading-none">
              {myStats ? formatPercent(myStats.winRate) : EMPTY}
            </span>
          </Figure>
          <Figure label="Peak">
            {peakRank ? <RankBadge rank={peakRank} iconSize={20} /> : EMPTY}
          </Figure>
        </dl>

        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 py-3 text-sm text-muted">
          <span className="inline-flex items-center gap-2">
            Recent form
            <FormPips results={form} />
          </span>
          <span>
            Tracked matches{' '}
            <span className="tabular text-fg">{myStats?.totalMatches ?? 0}</span>
          </span>
        </div>
      </header>

      {/* Characters */}
      <section>
        <h2 className="mb-2 border-b border-border pb-2 text-xl">Characters</h2>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-sm">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-1.5 pr-3">
                  <span className="eyebrow">Character</span>
                </th>
                <th className="px-3 pb-1.5">
                  <span className="eyebrow">Rank</span>
                </th>
                <th className="px-3 pb-1.5 text-right">
                  <span className="eyebrow">MMR</span>
                </th>
                <th className="px-3 pb-1.5 text-right">
                  <span className="eyebrow">Games</span>
                </th>
                <th className="pb-1.5 pl-3 text-right">
                  <span className="eyebrow">Updated</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {myPairs.map((p) => (
                <tr key={p.pairId} className="border-b border-border">
                  <td className="py-2 pr-3">
                    <CharacterName slug={p.character} isMain={p.isMain} iconSize={18} />
                  </td>
                  <td className="px-3 py-2">
                    <RankBadge rank={p.rank} iconSize={18} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <MmrCell
                      mmr={p.mmr}
                      provisional={p.provisional}
                      confidence={p.confidence}
                    />
                  </td>
                  <td className="tabular px-3 py-2 text-right text-muted">
                    {p.rankedGames || EMPTY}
                  </td>
                  <td className="py-2 pl-3 text-right text-muted">
                    {formatDate(p.mmrUpdated)}
                  </td>
                </tr>
              ))}
              {myPairs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-muted">
                    No tracked characters yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* History */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-2">
          <h2 className="text-xl">History</h2>
          <SegmentedControl
            label="Chart metric"
            value={chartMode}
            options={CHART_MODES}
            onChange={setChartMode}
          />
        </div>
        <div className="border border-border bg-surface p-3">
          <HistoryChart
            file={chartMode === 'mmr' ? history.mmr : history.rank}
            pairIds={pairIds}
            mode={chartMode}
          />
        </div>
      </section>

      {/* Head-to-head (only for sites that track it) */}
      {config.headToHead.enabled && (
        <section>
          <h2 className="mb-2 border-b border-border pb-2 text-xl">Head-to-head</h2>
          {opponents.played.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted">
              No crew matches recorded yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[420px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="pb-1.5 pr-3">
                      <span className="eyebrow">Opponent</span>
                    </th>
                    <th className="px-3 pb-1.5 text-right">
                      <span className="eyebrow">Matches</span>
                    </th>
                    <th className="pb-1.5 pl-3 text-right">
                      <span className="eyebrow">Rounds</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {opponents.played.map(({ opp, rec }) => (
                    <tr key={opp.id} className="border-b border-border">
                      <td className="py-2 pr-3">
                        <Link
                          to={`/player/${opp.id}`}
                          className="font-semibold hover:text-link hover:underline"
                        >
                          {opp.player_tag}
                        </Link>
                      </td>
                      <td className="tabular px-3 py-2 text-right">
                        <span
                          className={
                            rec!.matches >= rec!.oppMatches ? 'font-semibold' : ''
                          }
                        >
                          {rec!.matches}
                        </span>
                        <span className="text-muted">–{rec!.oppMatches}</span>
                      </td>
                      <td className="tabular py-2 pl-3 text-right text-muted">
                        {rec!.rounds}–{rec!.oppRounds}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {opponents.unplayed.length > 0 && (
                <p className="mt-2 text-xs text-muted">
                  Not yet played: {opponents.unplayed.map((o) => o.player_tag).join(', ')}
                  .
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Recent matches */}
      <section>
        <h2 className="mb-2 border-b border-border pb-2 text-xl">Recent matches</h2>
        <ul className="text-sm">
          {myMatches.map((m) => {
            const meA = m.a.playerId === id;
            const myRounds = meA ? m.roundsA : m.roundsB;
            const oppRounds = meA ? m.roundsB : m.roundsA;
            const mySide = meA ? m.a : m.b;
            const oppSide = meA ? m.b : m.a;
            const won = (m.winner === 'a') === meA;
            return (
              <li
                key={m.id}
                className="flex items-center gap-3 border-b border-border py-2"
              >
                <span className="w-16 shrink-0 text-xs text-muted" title={m.playedAt}>
                  {concludedAgo(m.playedAt)}
                </span>
                <span
                  className={`w-4 shrink-0 text-center font-bold ${won ? 'text-fg' : 'text-muted'}`}
                >
                  {won ? 'W' : 'L'}
                </span>
                <CharacterIcon slug={mySide.character} size={18} />
                <span className="tabular w-10 shrink-0">
                  {myRounds}–{oppRounds}
                </span>
                <span className="text-xs text-muted">vs</span>
                <MatchSideLabel side={oppSide} won={!won} iconSize={18} />
              </li>
            );
          })}
          {myMatches.length === 0 && (
            <li className="py-8 text-center text-muted">No matches yet.</li>
          )}
        </ul>
      </section>
    </div>
  );
}

function Figure({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-3 py-3 first:pl-0">
      <dt className="eyebrow">{label}</dt>
      <dd className="mt-1.5 flex min-h-[24px] items-center">{children}</dd>
    </div>
  );
}
