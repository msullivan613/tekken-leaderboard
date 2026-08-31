// One segmented control for the whole app. There used to be two — a square one
// for the leaderboard view toggle and a rounded one for the profile chart mode —
// which is the kind of drift that makes a UI look assembled rather than designed.

export interface Segment<T extends string> {
  value: T;
  label: string;
}

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: ReadonlyArray<Segment<T>>;
  onChange: (v: T) => void;
  /** Accessible name for the group, e.g. "Leaderboard view". */
  label: string;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex border border-border bg-surface"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(opt.value)}
            className={`px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
              active ? 'bg-fg text-bg' : 'text-muted hover:text-fg'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
