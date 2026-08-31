import { characterDisplayName } from '@/data/characters';
import type { CharacterSlug } from '@/types/domain';
import { CharacterIcon } from './icons';
import { EMPTY } from '@/lib/format';
import { MainMark } from './glyphs';

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
      {isMain && <MainMark className="text-muted" title="Main character" />}
    </span>
  );
}
