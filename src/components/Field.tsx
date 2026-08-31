import type { ReactNode, SelectHTMLAttributes } from 'react';
import { CaretDown } from './glyphs';

/** Native select with the browser chrome replaced. The Matches page used raw
 *  <select>/<input> next to fully custom UI, which is the most obvious kind of
 *  unfinished edge. */
export function Select({
  label,
  children,
  ...props
}: { label: string; children: ReactNode } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <label className="inline-flex items-center gap-2">
      <span className="sr-only">{label}</span>
      <span className="relative inline-flex items-center">
        <select
          {...props}
          className="appearance-none border border-border bg-surface py-1.5 pl-2.5 pr-7 text-sm text-fg hover:border-muted"
        >
          {children}
        </select>
        <CaretDown className="pointer-events-none absolute right-2.5 text-muted" />
      </span>
    </label>
  );
}

/** Checkbox styled as a pressable chip, matching SegmentedControl. */
export function ToggleChip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={() => onChange(!checked)}
      className={`border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] transition-colors ${
        checked
          ? 'border-fg bg-fg text-bg'
          : 'border-border bg-surface text-muted hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}
