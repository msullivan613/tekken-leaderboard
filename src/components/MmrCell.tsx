import { formatMmr } from '@/lib/format';

interface Props {
  mmr: number | null;
  provisional?: boolean;
  confidence?: string | null;
}

// Subtle "uncertain rating" treatment when provisional (§5.3/§5.5).
export function MmrCell({ mmr, provisional, confidence }: Props) {
  if (mmr == null) return <span className="text-muted">—</span>;
  return (
    <span
      className={
        provisional ? 'text-muted italic' : 'font-mono tabular-nums text-fg'
      }
      title={confidence ? `confidence: ${confidence}` : undefined}
    >
      {formatMmr(mmr)}
      {provisional && <span className="ml-1 text-xs align-super">?</span>}
    </span>
  );
}
