import { characterDisplayName } from '@/data/characters';
import type { CharacterSlug } from '@/types/domain';
import { CharacterIcon } from './icons';
import { EMPTY } from '@/lib/format';

export function CharacterName({
  slug,
  isMain,
  showIcon = true,
  iconSize = 22,
}: {
  slug: CharacterSlug | null;
  isMain?: boolean;
  showIcon?: boolean;
  iconSize?: number;
}) {
  if (!slug) return <span className="text-muted">{EMPTY}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {showIcon && <CharacterIcon slug={slug} size={iconSize} />}
      {characterDisplayName(slug)}
      {isMain && (
        <span
          className="text-[10px] uppercase tracking-wide text-accent-2"
          title="Main character"
        >
          ★
        </span>
      )}
    </span>
  );
}
