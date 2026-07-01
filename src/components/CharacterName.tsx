import { characterDisplayName } from '@/data/characters';
import type { CharacterSlug } from '@/types/domain';

export function CharacterName({
  slug,
  isMain,
}: {
  slug: CharacterSlug | null;
  isMain?: boolean;
}) {
  if (!slug) return <span className="text-muted">—</span>;
  return (
    <span className="inline-flex items-center gap-1">
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
