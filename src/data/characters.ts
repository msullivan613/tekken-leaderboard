// Canonical Tekken 8 character table.
//
// Verified (spec §7.6): EWGF `playedCharacters` and Wavu `.char` use the SAME
// display names ("Devil Jin", "Jack-8", "Yoshimitsu"), so the canonical key is
// the display name. We keep a URL-safe `slug` alongside it. No per-provider
// alias machinery is needed; an unrecognized name is logged and skipped by the
// pipeline (never silently mis-joined).

export interface CharacterMeta {
  slug: string; // URL-safe id, e.g. "devil_jin"
  displayName: string; // EWGF/Wavu display name, e.g. "Devil Jin"
}

// Source of truth: EWGF characterIdMap (spec §7.6). Order = roster/display order.
// slug rule: lowercase, drop apostrophes/periods, spaces→'_', hyphens removed.
const ROSTER: ReadonlyArray<readonly [displayName: string, slug: string]> = [
  ['Paul', 'paul'],
  ['Law', 'law'],
  ['King', 'king'],
  ['Yoshimitsu', 'yoshimitsu'],
  ['Hwoarang', 'hwoarang'],
  ['Xiaoyu', 'xiaoyu'],
  ['Jin', 'jin'],
  ['Bryan', 'bryan'],
  ['Kazuya', 'kazuya'],
  ['Steve', 'steve'],
  ['Jack-8', 'jack8'],
  ['Asuka', 'asuka'],
  ['Devil Jin', 'devil_jin'],
  ['Feng', 'feng'],
  ['Lili', 'lili'],
  ['Dragunov', 'dragunov'],
  ['Leo', 'leo'],
  ['Lars', 'lars'],
  ['Alisa', 'alisa'],
  ['Claudio', 'claudio'],
  ['Shaheen', 'shaheen'],
  ['Nina', 'nina'],
  ['Lee', 'lee'],
  ['Kuma', 'kuma'],
  ['Panda', 'panda'],
  ['Zafina', 'zafina'],
  ['Leroy', 'leroy'],
  ['Jun', 'jun'],
  ['Reina', 'reina'],
  ['Azucena', 'azucena'],
  ['Victor', 'victor'],
  ['Raven', 'raven'],
  ['Eddy', 'eddy'],
  ['Lidia', 'lidia'],
  ['Heihachi', 'heihachi'],
  ['Clive', 'clive'],
  ['Anna', 'anna'],
  ['Fahkumram', 'fahkumram'],
];

export type CharacterSlug = string;

export const CHARACTERS: Record<string, CharacterMeta> = Object.fromEntries(
  ROSTER.map(([displayName, slug]) => [slug, { slug, displayName }]),
);

const BY_DISPLAY_NAME = new Map<string, CharacterMeta>(
  ROSTER.map(([displayName, slug]) => [
    displayName.toLowerCase(),
    { slug, displayName },
  ]),
);

const BY_SLUG = new Map<string, CharacterMeta>(
  ROSTER.map(([displayName, slug]) => [slug, { slug, displayName }]),
);

/** Resolve an EWGF/Wavu display name to our canonical slug, or null if unknown. */
export function canonicalizeCharacter(name: string | null | undefined): CharacterSlug | null {
  if (!name) return null;
  const meta = BY_DISPLAY_NAME.get(name.trim().toLowerCase());
  return meta ? meta.slug : null;
}

/** Both providers share names, so these are aliases of canonicalizeCharacter. */
export const fromEwgf = canonicalizeCharacter;
export const fromWavu = canonicalizeCharacter;

export function characterMeta(slug: CharacterSlug): CharacterMeta | null {
  return BY_SLUG.get(slug) ?? null;
}

/** Human display name for a slug; falls back to the slug itself if unknown. */
export function characterDisplayName(slug: CharacterSlug): string {
  return BY_SLUG.get(slug)?.displayName ?? slug;
}

export function isKnownCharacter(slug: CharacterSlug): boolean {
  return BY_SLUG.has(slug);
}
