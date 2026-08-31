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
  nameClassName,
}: {
  slug: CharacterSlug | null;
  isMain?: boolean;
  showIcon?: boolean;
  iconSize?: number;
  /** Extra classes on the name text (e.g. `hidden sm:inline` to keep just the
   *  portrait on narrow screens). */
  nameClassName?: string;
}) {
  if (!slug) return <span className="text-muted">{EMPTY}</span>;
  return (
    <span className="inline-flex items-center gap-1.5">
      {showIcon && <CharacterIcon slug={slug} size={iconSize} />}
      <span className={nameClassName}>{characterDisplayName(slug)}</span>
      {isMain && <MainMark className="text-muted" title="Main character" />}
    </span>
  );
}
