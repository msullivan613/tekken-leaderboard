// The board's movement signals (§5.3): how a pair has moved, and how its player
// has been going. Both are deliberately MONOCHROME — weight and direction carry
// the meaning, not a green/red pair. Adding a semantic hue here would break the
// rule that color on this site means either "rank tier" or "these two players
// are opposed", for columns that read perfectly well without it.
import { EMPTY } from '@/lib/format';
import type { FormResult } from '@/lib/trends';
import { CaretDown, CaretUp } from './glyphs';

/** Placeholder while history is still in flight, so "loading" never reads as
 *  "no data". */
function LoadingDash() {
  return (
    <span className="inline-block h-px w-3 bg-muted/40 align-middle">
      <span className="sr-only">loading</span>
    </span>
  );
}

/** Trailing-window change. Null renders as an em dash: the history simply does
 *  not reach back that far, which is not the same claim as "no movement". */
export function DeltaCell({
  value,
  loading = false,
  title,
}: {
  value: number | null;
  loading?: boolean;
  title?: string;
}) {
  if (loading) return <LoadingDash />;
  // Wavu's Glicko rating is static for most of the crew most of the time, so a
  // literal "0" on three quarters of the rows trains the eye to skip the column
  // entirely. No-change renders as a hairline, leaving only real movement
  // typeset — so the rows that DID move are the ones that catch the eye.
  if (value === 0) {
    return (
      <span className="text-muted/60" title="No change">
        <span className="sr-only">no change</span>
        <span aria-hidden>·</span>
      </span>
    );
  }
  if (value == null) {
    return (
      <span className="text-muted" title="Not enough history to compare">
        {EMPTY}
      </span>
    );
  }
  const up = value > 0;
  return (
    <span
      className={`tabular inline-flex items-center gap-1 ${up ? 'font-semibold text-fg' : 'text-muted'}`}
      title={title}
    >
      {up ? <CaretUp /> : <CaretDown />}
      {Math.abs(value)}
    </span>
  );
}

/** Last few results, most recent first. Filled = win, hollow = loss. */
export function FormPips({
  results,
  loading = false,
}: {
  results: FormResult[];
  loading?: boolean;
}) {
  if (loading) return <LoadingDash />;
  if (results.length === 0) return <span className="text-muted">{EMPTY}</span>;
  const summary = results.join('');
  return (
    <span
      className="inline-flex items-center gap-[3px] align-middle"
      title={`Most recent first: ${summary}`}
    >
      <span className="sr-only">{summary}</span>
      {results.map((r, i) => (
        <span
          key={i}
          aria-hidden
          className={`block h-2.5 w-2.5 border ${
            r === 'W' ? 'border-fg bg-fg' : 'border-muted bg-transparent'
          }`}
        />
      ))}
    </span>
  );
}
