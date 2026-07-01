import type { RankTier } from '@/data/ranks';
import { EMPTY } from '@/lib/format';

export function RankBadge({ rank }: { rank: RankTier | null }) {
  if (!rank) return <span className="text-muted">{EMPTY}</span>;
  const color = `rgb(var(${rank.colorVar}))`;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium"
      style={{ color }}
      title={rank.display}
    >
      <span
        aria-hidden
        className="h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      {rank.display}
    </span>
  );
}
