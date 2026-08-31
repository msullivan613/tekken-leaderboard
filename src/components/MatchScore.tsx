// The versus seam — the single carrier of "two sides meet here" (§5.8). It is
// used only in genuine matchup contexts: this score block and the head-to-head
// drilldown. P1/P2 colour is legitimate here for the same reason.
export function MatchScore({
  roundsA,
  roundsB,
  winner,
  size = 'sm',
}: {
  roundsA: number;
  roundsB: number;
  winner: 'a' | 'b';
  size?: 'sm' | 'lg';
}) {
  const aWon = winner === 'a';
  const big = size === 'lg';
  return (
    <span
      className={`vs-seam inline-flex items-center justify-center bg-surface-2 ${
        big ? 'px-4 py-2' : 'px-2.5 py-1'
      }`}
    >
      <span
        className={`tabular inline-flex items-center gap-1.5 font-semibold leading-none ${
          big ? 'text-3xl' : 'text-base'
        }`}
      >
        <span className={aWon ? 'text-p1' : 'text-muted'}>{roundsA}</span>
        <span className="text-xs font-normal text-muted">–</span>
        <span className={aWon ? 'text-muted' : 'text-p2'}>{roundsB}</span>
      </span>
    </span>
  );
}
