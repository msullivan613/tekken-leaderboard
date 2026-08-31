// Small inline SVGs replacing the unicode glyphs (▾ ★ ✕ →) the UI used as icons.
// Text glyphs inherit a font's own metrics, so they sat off-baseline and changed
// size between platforms; these scale with the type and align to it.

type GlyphProps = { size?: number; className?: string };

export function CaretDown({ size = 10, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
    >
      <path d="M1 3.5 5 7.5 9 3.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

export function CaretUp({ size = 10, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
    >
      <path d="M1 6.5 5 2.5 9 6.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

/** Marks a player's main character. */
export function MainMark({
  size = 9,
  className = '',
  title,
}: GlyphProps & { title?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 10 10"
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      className={`inline-block shrink-0 ${className}`}
    >
      {title && <title>{title}</title>}
      <path
        d="M5 0.5 6.3 3.7 9.5 5 6.3 6.3 5 9.5 3.7 6.3 0.5 5 3.7 3.7Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function Close({ size = 12, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
    >
      <path
        d="M1.5 1.5 10.5 10.5M10.5 1.5 1.5 10.5"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export function ArrowRight({ size = 12, className = '' }: GlyphProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      aria-hidden
      className={`inline-block shrink-0 ${className}`}
    >
      <path
        d="M1 6h9M6.5 2 10.5 6 6.5 10"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
