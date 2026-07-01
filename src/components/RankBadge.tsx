import type { RankTier } from '@/data/ranks';
import { EMPTY } from '@/lib/format';
import { RankIcon } from './icons';

export function RankBadge({
  rank,
  iconSize = 24,
  showLabel = true,
}: {
  rank: RankTier | null;
  iconSize?: number;
  showLabel?: boolean;
}) {
  if (!rank) return <span className="text-muted">{EMPTY}</span>;
  const color = `rgb(var(${rank.colorVar}))`;
  return (
    <span
      className="inline-flex items-center gap-1.5 font-medium"
      style={{ color }}
      title={rank.display}
    >
      <RankIcon rank={rank} size={iconSize} />
      {showLabel && rank.display}
    </span>
  );
}
