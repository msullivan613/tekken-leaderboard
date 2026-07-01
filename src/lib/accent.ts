// Stable per-player accent color derived from the immutable `id` (§5.8), so a
// player's multiple pair rows read as one person.

const ACCENT_VARS = [
  '--accent-0',
  '--accent-1',
  '--accent-2p',
  '--accent-3',
  '--accent-4',
  '--accent-5',
  '--accent-6',
  '--accent-7',
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
