import { useState } from 'react';
import { useData, useStats } from '@/data/DataProvider';
import { rawH2H, directedH2H } from '@/lib/stats';
import { EMPTY, formatMmr } from '@/lib/format';
import { pairsForPlayer, type PairViewModel } from '@/lib/leaderboard';
import { characterDisplayName } from '@/data/characters';
import { PlayerAccent } from '@/components/PlayerAccent';
import { Close } from '@/components/glyphs';
import type { Player } from '@/types/domain';

/** Cell tint for a record, on a P1↔P2 diverging scale.
 *
 *  The previous ramp was computed inline as red→green, which is the one
 *  diverging pair red-green colourblind readers cannot split, and it drifted
 *  through a muddy olive at parity. Ember/volt is colourblind-safe, reads on
 *  both grounds, and reuses the language the rest of the site already uses for
 *  "these two are opposed". Magnitude rides on alpha so the hue never shifts. */
function cellTint(share: number): string | undefined {
  // share: fraction of matches the ROW player won. 0.5 = parity = no tint.
  const lean = (share - 0.5) * 2; // -1 (row losing) .. +1 (row winning)
  const strength = Math.min(Math.abs(lean), 1) * 0.28;
  if (strength < 0.02) return undefined;
  return `rgb(var(${lean > 0 ? '--p1' : '--p2'}) / ${strength.toFixed(3)})`;
}

export function HeadToHeadPage() {
  const { players, pairs } = useData();
  const stats = useStats();
  const [selected, setSelected] = useState<{ a: Player; b: Player } | null>(null);

  return (
    <div className="space-y-6">
      <div className="border-b border-border pb-3">
        <h1 className="text-3xl sm:text-4xl">Head-to-head</h1>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Each cell is the row player&apos;s record against the column player. Click one
          for the full breakdown.
        </p>
      </div>

      <div>
        <div className="overflow-x-auto border border-border">
          <table className="text-sm">
            <thead>
              <tr className="border-b border-border bg-surface-2">
                <th className="px-3 py-2" />
                {players.map((p) => (
                  <th key={p.id} className="px-3 py-2" title={p.player_tag}>
                    <span className="eyebrow">{p.player_tag.slice(0, 6)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {players.map((row) => (
                <tr key={row.id} className="border-b border-border last:border-b-0">
                  <th className="whitespace-nowrap px-3 py-2 text-left text-xs font-semibold">
                    {row.player_tag}
                  </th>
                  {players.map((col) => {
                    if (row.id === col.id) {
                      return (
                        <td
                          key={col.id}
                          className="bg-surface-2 px-3 py-2 text-center text-muted"
                          aria-label="same player"
                        >
                          <span aria-hidden>·</span>
                        </td>
                      );
                    }
                    const rec = directedH2H(stats, row.id, col.id);
                    const total = rec ? rec.matches + rec.oppMatches : 0;
                    const share = total ? rec!.matches / total : 0.5;
                    const label = rec
                      ? `${row.player_tag} ${rec.matches}–${rec.oppMatches} ${col.player_tag}`
                      : `${row.player_tag} has not played ${col.player_tag}`;
                    return (
                      <td
                        key={col.id}
                        className={`tabular whitespace-nowrap px-3 py-2 text-center ${
                          rec
                            ? 'cursor-pointer hover:ring-1 hover:ring-inset hover:ring-fg'
                            : ''
                        }`}
                        style={{ backgroundColor: rec ? cellTint(share) : undefined }}
                        title={label}
                        onClick={() => rec && setSelected({ a: row, b: col })}
                      >
                        {rec ? `${rec.matches}–${rec.oppMatches}` : EMPTY}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>Row player losing</span>
          <span className="inline-flex border border-border" aria-hidden>
            {[-1, -0.5, 0, 0.5, 1].map((lean) => (
              <span
                key={lean}
                className="block h-3 w-7"
                style={{ backgroundColor: cellTint(lean / 2 + 0.5) ?? 'transparent' }}
              />
            ))}
          </span>
          <span>winning</span>
        </div>
      </div>

      {selected && (
        <MatchupPanel
          a={selected.a}
          b={selected.b}
          bestPair={(id: string) => pairsForPlayer(pairs, id)[0] ?? null}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
}

/** The site's loudest element, and the only place it earns being loud: two
 *  players actually opposed, across the seam. */
function MatchupPanel({
  a,
  b,
  bestPair,
  onClose,
}: {
  a: Player;
  b: Player;
  bestPair: (id: string) => PairViewModel | null;
  onClose: () => void;
}) {
  const stats = useStats();
  const rec = rawH2H(stats, a.id, b.id);
  if (!rec) return null;
  // headToHead is keyed idA<idB; map to a-vs-b orientation.
  const aIsFirst = a.id < b.id;
  const aMatches = aIsFirst ? rec.matchesA : rec.matchesB;
  const bMatches = aIsFirst ? rec.matchesB : rec.matchesA;
  const aRounds = aIsFirst ? rec.roundsA : rec.roundsB;
  const bRounds = aIsFirst ? rec.roundsB : rec.roundsA;

  return (
    <section className="border border-border bg-surface">
      <div className="flex items-center justify-between border-b border-border px-3 py-1.5">
        <span className="eyebrow">Matchup</span>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"
          onClick={onClose}
        >
          Close
          <Close />
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] items-stretch">
        <div className="flex flex-col items-end justify-center gap-2 bg-p1/[0.08] p-4 text-right sm:p-5">
          <PlayerAccent playerId={a.id} tag={a.player_tag} size={36} />
          <span className="text-xl font-extrabold leading-none text-p1 sm:text-2xl">
            {a.player_tag}
          </span>
          <SideMeta pair={bestPair(a.id)} />
        </div>

        <div className="vs-seam flex items-center justify-center bg-fg px-4">
          <span className="text-xs font-extrabold tracking-wider text-bg">VS</span>
        </div>

        <div className="flex flex-col justify-center gap-2 bg-p2/[0.08] p-4 sm:p-5">
          <PlayerAccent playerId={b.id} tag={b.player_tag} size={36} />
          <span className="text-xl font-extrabold leading-none text-p2 sm:text-2xl">
            {b.player_tag}
          </span>
          <SideMeta pair={bestPair(b.id)} />
        </div>
      </div>

      <div className="grid grid-cols-2 border-t border-border">
        <ScorePair label="Matches" a={aMatches} b={bMatches} />
        <div className="border-l border-border">
          <ScorePair label="Rounds" a={aRounds} b={bRounds} />
        </div>
      </div>
    </section>
  );
}

function SideMeta({ pair }: { pair: PairViewModel | null }) {
  if (!pair) return null;
  return (
    <span className="text-xs text-muted">
      {characterDisplayName(pair.character)}
      {pair.rank ? ` · ${pair.rank.display}` : ''}
      {pair.mmr != null ? ` · ${formatMmr(pair.mmr)}` : ''}
    </span>
  );
}

function ScorePair({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div className="p-4">
      <div className="eyebrow">{label}</div>
      <div className="tabular mt-1 text-3xl font-semibold leading-none">
        <span className={a >= b ? 'text-p1' : 'text-muted'}>{a}</span>
        <span className="text-muted"> – </span>
        <span className={b >= a ? 'text-p2' : 'text-muted'}>{b}</span>
      </div>
    </div>
  );
}
