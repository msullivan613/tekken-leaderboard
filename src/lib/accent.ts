// Stable per-player accent color derived from the immutable `id` (§5.8), so a
// player's multiple pair rows read as one person.
//
// This only does a job in the Pairs view, where one person holds several rows.
// In Players view every row is a different person, so the color would carry zero
// information — callers must not render it there (§5.3).

const ACCENT_VARS = [
  '--pl-0',
  '--pl-1',
  '--pl-2',
  '--pl-3',
  '--pl-4',
  '--pl-5',
  '--pl-6',
  '--pl-7',
];

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function accentVar(playerId: string): string {
  const idx = hashString(playerId) % ACCENT_VARS.length;
  return ACCENT_VARS[idx]!;
}

/** CSS color value usable in style props. */
export function accentColor(playerId: string): string {
  return `rgb(var(${accentVar(playerId)}))`;
}
