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
      className={`tabular ${provisional ? 'text-muted' : 'font-medium text-fg'}`}
      title={confidence ? `confidence: ${confidence}` : undefined}
    >
      {formatMmr(mmr)}
      {provisional && (
        <span className="ml-0.5 align-super text-[10px]" title="Provisional rating">
          ?
        </span>
      )}
    </span>
  );
}
