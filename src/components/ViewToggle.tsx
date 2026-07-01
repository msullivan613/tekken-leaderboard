import type { LeaderboardView } from '@/lib/leaderboard';

const OPTIONS: Array<{ value: LeaderboardView; label: string }> = [
  { value: 'players', label: 'Players' },
  { value: 'pairs', label: 'Pairs' },
];

export function ViewToggle({
  value,
  onChange,
}: {
  value: LeaderboardView;
  onChange: (v: LeaderboardView) => void;
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1 text-sm rounded transition-colors ${
            value === opt.value
              ? 'bg-accent text-bg font-medium'
              : 'text-muted hover:text-fg'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
