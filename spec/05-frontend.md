# 5. Frontend (React + Vite SPA)

Reads the committed JSON, renders the crew scoreboard. No writes, no auth. Visual
design is deliberately **not** specified here beyond structure — art direction is its
own pass (brief §4.1); this doc defines routes, data flow, and component contracts so
the design pass has a skeleton to dress.

## 5.1 Routes

HashRouter (§1.2 decision). Routes:

| Path          | Page                | Purpose                                               |
| ------------- | ------------------- | ----------------------------------------------------- |
| `/`           | `LeaderboardPage`   | landing; the core board (§5.3) + recent-matches strip |
| `/player/:id` | `PlayerProfilePage` | rich profile (§5.5)                                   |
| `/h2h`        | `HeadToHeadPage`    | full crew matrix + pair drill-down (§5.6)             |
| `/matches`    | `MatchesPage`       | full match log with filters                           |
| `*`           | `NotFound`          |                                                       |

## 5.2 Data loading

Data is loaded relative to `import.meta.env.BASE_URL` (so it resolves under each
site's Pages sub-path) and cached/deduped by a small `useJson` hook. To keep the
initial load light, files are split into **core** (loaded app-wide) and **heavy**
(loaded lazily by the pages that need them — issue #18).

```ts
// src/data/useJson.ts — fetch one file relative to BASE_URL, typed + cached
function useJson<T>(name: string): {
  data: T | null;
  error: Error | null;
  loading: boolean;
};

// src/data/DataProvider.tsx — loads the CORE light files only (players/ranks/glicko),
// which power the leaderboard + nav everywhere:
interface DataContextValue {
  loading: boolean;
  error: Error | null;
  lastUpdated: string | null; // max(generatedAt of ranks/glicko) → "Last updated"
  players: Player[];
  playerById: Map<string, Player>;
  mainCharacterByPlayer: Map<string, CharacterSlug | null>; // derives null mains (§conventions)
  pairs: PairViewModel[]; // ranks ⨝ glicko ⨝ players, one per pair (§5.4)
}

// Heavy files load on demand, cached across navigations by the same useJson cache:
function useMatches(): MatchesFile | null; // Matches, Profile, H2H, home Recent strip
function useStats(): StatsFile | null; // Profile, H2H
function useHistory(): { rank: HistoryFile | null; mmr: HistoryFile | null }; // Profile charts
```

**Joining** happens client-side in `src/lib/leaderboard.ts`:
`PairViewModel = players.json ⨝ ranks.json ⨝ glicko.json` on `pairId`/`playerId`
(`buildPairViewModels`). `players.json` is the only required file; the rest degrade to
null/empty. Missing MMR or rank ⇒ the field is `null` and the UI renders `—`. A player
with no qualifying pairs still appears in the roster/profiles with an empty pair list.
The history/match archives (`*.<year>.json`) are **never** fetched by the frontend —
they're build-time cold storage (§2.6, §2.8.1).

## 5.3 Leaderboard (core, `/`)

The headline feature (brief §5.1). A sortable board with the **Players ⇄ Pairs
toggle**.

```
┌───────────────────────────────────────────────────────────┐
│  C-TOWN LEADERBOARD          [Players | Pairs]  sort:[Rank▾]│
│  Last updated 2h ago                                        │
├───────────────────────────────────────────────────────────┤
│ #1  ▟ Matt   Jin           Tekken God    1875 MMR  main:Jin │
│ #2  ▟ Matt   Devil Jin     Fujin         1740 MMR  peak:TGS │  ← Pairs view:
│ #3  ▛ Alex   King          Fujin         1710 MMR           │    same-player rows
│ …                                                            │    share accent color
└───────────────────────────────────────────────────────────┘
```

**Toggle behavior** (`src/lib/leaderboard.ts`):

- **Players view** (default, config `leaderboard.defaultView`): collapse pairs to one
  row per player = their **best pair**. Best = highest `rating` (config
  `bestPairMetric: "mmr"`); if a player has no MMR anywhere, fall back to highest
  `rankTier`. The chosen pair's character is shown; `main_character` and `peak_rank`
  render as their own columns regardless. Resolves brief §7 "which lists get the
  toggle / how 'best' is chosen."
- **Pairs view:** every qualifying pair is its own row; rows belonging to the same
  player share a visual accent (color/avatar) so multiple top spots read as one
  person (brief §5.1).

**Sorting:** `defaultSort` (config; currently `mmr`) with the other signal as
tiebreak. Header click toggles between Rank and MMR sort (they disagree — the brief
wants both signals side by side). Sort applies within the active view.

**Columns:** rank position, accent/avatar, player tag, character (context-dependent),
current rank (icon + color from `src/data/ranks.ts`), MMR (with a subtle provisional
treatment when `provisional`), main character, peak rank, platform icon.

Below the board: a **recent-matches strip** (last 20, from `matches.json`).

Components: `LeaderboardTable`, `ViewToggle`, `SortHeader`, `RankBadge`, `MmrCell`,
`PlayerAccent`, `LastUpdated`, `RecentMatchesStrip`.

## 5.4 Pair view model

```ts
interface PairViewModel {
  pairId: string;
  playerId: string;
  playerTag: string;
  character: CharacterSlug;
  isMain: boolean; // character === effective main
  rank: RankTier | null;
  rankedGames: number;
  mmr: number | null; // Wavu μ
  sigmaSquared: number | null; // Wavu σ² (variance, §2.5)
  confidence: WavuConfidence | null;
  provisional: boolean;
  platform: Platform;
  peakRank: RankTier | null; // player-level rollup (§2.4)
  region: string | null;
  lastSeen: string | null;
  mmrUpdated: string | null;
}
```

## 5.5 Player profile (`/player/:id`)

Rolls all of one person's pairs into a page (brief §5.4):

- **Header:** tag, platform, main character (flagged), peak rank, socials.
- **Characters list:** each tracked pair with current rank + MMR; main flagged.
- **History charts (Recharts):** rank-over-time and **MMR-over-time** (the headline
  chart, brief §5.5), built from `rankhistory`/`mmrhistory` series for this player's
  pairs. Default overlays the player's characters on one MMR chart; per-character
  toggle available.
- **Head-to-head:** this player's game record vs each crew member (from
  `stats.json.headToHead`), with a drill-down into `charMatchups` (§2.9).
- **Match & session stats:** recent matches, most-played character, win rate (from
  `stats.json.players[id]`).

Components: `ProfileHeader`, `CharacterPairList`, `HistoryChart` (shared,
rank|mmr mode), `PlayerH2HTable`, `PlayerMatchList`, `PlayerStatCards`.

## 5.6 Head-to-head (`/h2h`) — gated per site

**Shown only when `config.headToHead.enabled`** (config is baked into each site's
bundle at build time). A site with it off hides the H2H page + nav link _and_ the
profile H2H section — because without ewgf that site gathers no custom-lobby crew
matches to populate them (§4.6, §8). Currently c-town shows it; area-256 doesn't.

- **Crew matrix:** everyone-vs-everyone grid of **match records** (brief §5.3 "full
  crew grid"), colored by win share, reading from `stats.json.headToHead`.
- **Cell drill-down:** click a cell → the two players' matches + rounds record and the
  optional per-character matchup breakdown (`charMatchups`).

Components: `H2HMatrix`, `H2HCell`, `MatchupDrilldown`. Data loads lazily via
`useStats()` / `useMatches()` (§5.2).

## 5.7 Matches (`/matches`)

Full log from `matches.json` with client-side filters (player, match type, crew-only).
Opponents without a `playerId` are non-crew randoms and render by name (no link). Rows
show each side's character, the rounds score, "concluded X ago", and match type
(quick/ranked from tknow; player/group from ewgf where enabled).

## 5.8 Design direction (pointer, not spec)

Per brief §4.1 the look is **ours, from scratch** — not a re-skin of the inspiration
site. Structural hooks this spec guarantees for the design pass:

- Every player has a stable **accent** (derived from `id`) usable as color/avatar to
  visually group a player's multiple pair rows.
- `src/data/ranks.ts` centralizes rank **color + icon** tokens (custom style vs.
  official Tekken iconography is a design-pass call — brief §4.1).
- Theme values are CSS custom properties in `src/styles/tokens.css`, so the whole
  palette/vibe (slick-competitive vs. playful-irreverent) is swappable in the design
  pass without touching components.
- "C-Town" is the SFW-safe slug for titles/URLs; how far in-site branding leans into
  the full crew name is a branding-pass decision (brief naming note). Use the
  frontend-design skill when that pass starts.

## 5.9 Non-goals reminder (brief §3)

No login, no in-browser result submission, no server calls, Tekken 8 only, no
brackets. The app is strictly a reader of static JSON.
