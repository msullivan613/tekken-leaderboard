// Match-sync job (spec §4). Read the crew Google Sheet, validate rows against the
// roster, write matches.json, then derive stats.json.
import { loadConfig } from '../shared/config';
import { readDataFile, writeDataFile } from '../shared/atomicWrite';
import { fetchSheet } from './sheet';
import { buildMatches } from './transform';
import { deriveStats } from './stats';
import type { MatchesFile, PlayersFile, StatsFile } from '@/types/data-files';

async function main() {
  const config = loadConfig();
  const players = readDataFile<PlayersFile>('players.json')?.players ?? [];

  if (config.sheet.csvUrl.includes('REPLACE_ME')) {
    console.error(
      '[match-sync] config.sheet.csvUrl is not set — skipping (no sheet configured).',
    );
    return;
  }

  const rows = await fetchSheet(config.sheet.csvUrl);
  const { matches, rejected } = buildMatches(rows, players);
  const now = new Date().toISOString();

  const matchesFile: MatchesFile = {
    schemaVersion: 1,
    source: 'google-sheet',
    generatedAt: now,
    rowCount: matches.length,
    rejectedCount: rejected.length,
    matches,
    rejected,
  };

  const statsFile: StatsFile = deriveStats(matches, now);

  const wroteMatches = writeDataFile('matches.json', matchesFile);
  const wroteStats = writeDataFile('stats.json', statsFile);
  console.log(
    `[match-sync] matches:${matches.length} rejected:${rejected.length} ` +
      `written(matches:${wroteMatches} stats:${wroteStats})`,
  );
}

main().catch((err) => {
  console.error('[match-sync] fatal:', err);
  process.exit(1);
});
