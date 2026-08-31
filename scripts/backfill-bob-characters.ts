// One-shot migration — safe to delete once it has run against every site.
//
// Bob released 2026-08-20, but he was missing from `characterIdMap`/`ROSTER`
// until now, so `fromCharacterId(47)` returned null. Unlike the rank path
// (which warns and skips), the match path in `tknow.ts#toSide` / `ewgf.ts#toSide`
// wrote the null straight onto the match side — silently. `mergeMatches` keeps
// the *existing* row on an id collision, so those rows never self-heal from a
// later run; they have to be repaired in place.
//
// Every null-character side in the committed data is Bob: across ~16.8k matches
// there is not one before 2026-08-20, and char_id 47 is the only id the pipeline
// logged as unmapped. The date guard keeps anything else out of scope.
//
// Run once per site:
//   SITE=c-town   npx tsx scripts/backfill-bob-characters.ts
//   SITE=area-256 npx tsx scripts/backfill-bob-characters.ts
import { readdirSync } from 'node:fs';
import { deriveStats } from './online-stats/stats';
import { mergeMatches } from './online-stats/matches';
import { DATA_DIR, SITE } from './shared/config';
import { readDataFile, writeDataFile } from './shared/atomicWrite';
import type { Match, MatchArchiveFile, MatchesFile, StatsFile } from '@/types/data-files';

const BOB_RELEASED = '2026-08-20'; // ISO date; matches before this predate Bob.
const BOB = 'bob';

/** Fill in `character` on any side left null by the unmapped char_id 47, for
 *  matches played on or after Bob's release. Returns how many sides changed. */
function patch(matches: Match[]): number {
  let patched = 0;
  for (const m of matches) {
    if (m.playedAt.slice(0, 10) < BOB_RELEASED) continue;
    for (const side of [m.a, m.b]) {
      if (side.character === null) {
        side.character = BOB;
        patched++;
      }
    }
  }
  return patched;
}

const live = readDataFile<MatchesFile>('matches.json');
if (!live) throw new Error(`[backfill] ${SITE}: no matches.json`);

const archiveNames = readdirSync(DATA_DIR).filter((n) =>
  /^matches\.\d{4}\.json$/.test(n),
);
const archives = archiveNames.map((name) => {
  const file = readDataFile<MatchArchiveFile>(name);
  if (!file) throw new Error(`[backfill] ${SITE}: unreadable ${name}`);
  return { name, file };
});

let patched = patch(live.matches);
// Crew/feed counts key off playerId, not character, so they are unaffected.
if (writeDataFile('matches.json', live)) console.log(`[backfill] ${SITE}: matches.json`);
for (const { name, file } of archives) {
  patched += patch(file.matches);
  if (writeDataFile(name, file)) console.log(`[backfill] ${SITE}: ${name}`);
}

// stats.json is derived over the full retained set (live feed + every archive),
// and tests/data-files.test.ts asserts it equals deriveStats(allMatches) — so it
// has to be regenerated here, in the same commit. Reuse the committed
// `generatedAt` so the diff carries only real stat movement.
const stats = readDataFile<StatsFile>('stats.json');
if (stats) {
  const all = mergeMatches(
    live.matches,
    archives.flatMap(({ file }) => file.matches),
  );
  if (writeDataFile('stats.json', deriveStats(all, stats.generatedAt))) {
    console.log(`[backfill] ${SITE}: stats.json`);
  }
}

console.log(`[backfill] ${SITE}: ${patched} match sides null → ${BOB}`);
