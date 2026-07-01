// Manual helper (§3.2): resolve a player tag → polaris/tekken_id via EWGF search,
// so a new member's id can be filled into players.json. Run:
//   EWGF_API_KEY=… npm run resolve-id -- "SugarFree"
import { loadConfig } from '../shared/config';
import { fetchWithRetry } from '../shared/http';

interface PlayerSearchDTO {
  polarisId: string;
  name: string;
  regionId?: number;
}

async function main() {
  const query = process.argv.slice(2).join(' ').trim();
  if (!query) {
    console.error('usage: npm run resolve-id -- "<player tag>"');
    process.exit(2);
  }
  const apiKey = process.env.EWGF_API_KEY ?? '';
  if (!apiKey) {
    console.error('EWGF_API_KEY is required (EWGF search is gated).');
    process.exit(2);
  }
  const config = loadConfig();
  const url = `${config.sources.ewgfBaseUrl}${config.sources.ewgfPlayerPath}/search?query=${encodeURIComponent(query)}`;
  const res = await fetchWithRetry(url, {
    headers: { Accept: 'application/json', Authorization: `Bearer ${apiKey}` },
  });
  if (!res.ok) {
    console.error(`search failed: HTTP ${res.status}`);
    process.exit(1);
  }
  const results = (await res.json()) as PlayerSearchDTO[];
  if (!results.length) {
    console.log(`No matches for "${query}".`);
    return;
  }
  for (const r of results) {
    console.log(`${r.polarisId}\t${r.name}${r.regionId != null ? `\t(region ${r.regionId})` : ''}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
