import { describe, it, expect } from 'vitest';
import {
  CHARACTERS,
  canonicalizeCharacter,
  characterIdMap,
  fromCharacterId,
  isKnownCharacter,
} from '@/data/characters';

// The roster lives in two tables that must stay in step: ROSTER (displayName ⇄
// slug, what ewgf/Wavu key on) and characterIdMap (numeric id → displayName,
// what tknow keys on). fromCharacterId chains them, so an id whose name is
// missing from ROSTER resolves to null *silently* — the pipeline then writes
// `character: null` onto match sides with no warning. That is exactly how Bob
// went unnoticed for 11 days after release (id 47).
describe('character tables', () => {
  it('every characterIdMap name resolves to a known slug', () => {
    for (const [id, displayName] of Object.entries(characterIdMap)) {
      const slug = canonicalizeCharacter(displayName);
      expect(
        slug,
        `char_id ${id} ("${displayName}") is missing from ROSTER`,
      ).not.toBeNull();
      expect(isKnownCharacter(slug!)).toBe(true);
    }
  });

  it('slugs and display names are each unique', () => {
    const slugs = Object.keys(CHARACTERS);
    expect(new Set(slugs).size).toBe(slugs.length);
    const names = Object.values(CHARACTERS).map((c) => c.displayName.toLowerCase());
    expect(new Set(names).size).toBe(names.length);
  });

  it('every roster character is reachable by numeric id', () => {
    const mapped = new Set(
      Object.values(characterIdMap).map((n) => canonicalizeCharacter(n)),
    );
    for (const slug of Object.keys(CHARACTERS)) {
      expect(mapped.has(slug), `${slug} has no characterIdMap entry`).toBe(true);
    }
  });

  it('resolves Bob (released 2026-08-20, tknow char_id 47)', () => {
    expect(fromCharacterId(47)).toBe('bob');
    expect(canonicalizeCharacter('Bob')).toBe('bob');
  });
});
