// Wavu Wank client (spec §3.3 / §7.3). No per-player JSON — fetch the profile
// HTML and parse the stable .rating-group / .rating DOM. Anonymous, ToS-respecting.
import { parse, type HTMLElement } from 'node-html-parser';
import { fromWavu } from '@/data/characters';
import type { WavuConfidence } from '@/types/domain';
import { fetchWithRetry } from '../shared/http';

export interface WavuCharacterStat {
  character: string; // canonical slug
  rating: number | null; // μ
  sigmaSquared: number | null; // σ²
  confidence: WavuConfidence;
  games: number;
  lastUpdated: string | null; // ISO
}

function bucketFromLabel(label: string): WavuConfidence {
  const l = label.toLowerCase();
  if (l.includes('leaderboard')) return 'leaderboard';
  if (l.includes('unqualified')) return 'unqualified';
  return 'provisional';
}

function firstInt(text: string): number | null {
  const m = text.replace(/,/g, '').match(/-?\d+/);
  return m ? Number(m[0]) : null;
}

function parsePrintDate(el: HTMLElement | null): string | null {
  if (!el) return null;
  const m = el.innerHTML.match(/printDate\((\d+)\)/);
  if (!m) return null;
  return new Date(Number(m[1]) * 1000).toISOString();
}

/** Parse already-fetched profile HTML (also used directly by unit tests). */
export function parseWavuProfile(html: string): WavuCharacterStat[] {
  const root = parse(html);
  const out: WavuCharacterStat[] = [];
  for (const group of root.querySelectorAll('.rating-group')) {
    const label = group.querySelector('.label')?.text ?? '';
    const confidence = bucketFromLabel(label);
    for (const rating of group.querySelectorAll('.rating')) {
      const name = rating.querySelector('.char')?.text.trim() ?? '';
      const slug = fromWavu(name);
      if (!slug) {
        if (name) console.warn(`[wavu] unmapped character "${name}" — skipped.`);
        continue;
      }
      out.push({
        character: slug,
        rating: firstInt(rating.querySelector('.mu')?.text ?? ''),
        sigmaSquared: firstInt(rating.querySelector('.sigma')?.text ?? ''),
        confidence,
        games: firstInt(rating.querySelector('.games')?.text ?? '') ?? 0,
        lastUpdated: parsePrintDate(rating.querySelector('.last-seen')),
      });
    }
  }
  return out;
}

/** Fetch + parse a player's Wavu profile. Never throws on one player's failure —
 *  logs and returns [] (§3.3). */
export async function getPlayerCharacters(
  tekkenId: string,
  profileBaseUrl: string,
  userAgent: string,
): Promise<WavuCharacterStat[]> {
  const undashed = tekkenId.replaceAll('-', '');
  const url = `${profileBaseUrl}/player/${undashed}`;
  try {
    const res = await fetchWithRetry(url, {
      headers: { 'User-Agent': userAgent, 'Accept-Encoding': 'gzip' },
    });
    if (!res.ok) {
      console.warn(`[wavu] ${tekkenId}: HTTP ${res.status}.`);
      return [];
    }
    const html = await res.text();
    return parseWavuProfile(html);
  } catch (err) {
    console.warn(`[wavu] ${tekkenId}: fetch failed —`, (err as Error).message);
    return [];
  }
}
