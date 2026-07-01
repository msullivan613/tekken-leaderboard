import { useState } from 'react';
import type { CharacterSlug } from '@/types/domain';
import { characterDisplayName } from '@/data/characters';
import type { RankTier } from '@/data/ranks';

const BASE = import.meta.env.BASE_URL;

/** Circular character portrait (Tekken 8 roster art, bundled under public/).
 *  Falls back to a colored initial if the asset is missing. */
export function CharacterIcon({
  slug,
  size = 22,
  className = '',
}: {
  slug: CharacterSlug | null | undefined;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  const name = slug ? characterDisplayName(slug) : '';
  if (!slug || broken) {
    return (
      <span
        className={`inline-flex shrink-0 items-center justify-center rounded-full bg-surface-2 text-muted ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.5 }}
        aria-hidden
      >
        {name ? name.charAt(0) : '?'}
      </span>
    );
  }
  return (
    <img
      src={`${BASE}char-icons/${slug}.webp`}
      alt={name}
      title={name}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`inline-block shrink-0 rounded-full object-cover ${className}`}
      style={{ width: size, height: size }}
    />
  );
}

/** Tekken 8 rank tier icon (bundled under public/), falls back to a colored dot. */
export function RankIcon({
  rank,
  size = 24,
  className = '',
}: {
  rank: RankTier | null | undefined;
  size?: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);
  if (!rank) return null;
  const color = `rgb(var(${rank.colorVar}))`;
  if (broken) {
    return (
      <span
        aria-hidden
        className={`inline-block shrink-0 rounded-full ${className}`}
        style={{ width: size * 0.5, height: size * 0.5, backgroundColor: color }}
      />
    );
  }
  return (
    <img
      src={`${BASE}${rank.icon}`}
      alt={rank.display}
      title={rank.display}
      width={size}
      height={size}
      loading="lazy"
      onError={() => setBroken(true)}
      className={`inline-block shrink-0 object-contain ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
