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
function useHistory(): { rank: HistoryFile | null; mmr: HistoryFile | null }; // Profile charts + board movement
```

**Joining** happens client-side in `src/lib/leaderboard.ts`:
`PairViewModel = players.json ⨝ ranks.json ⨝ glicko.json` on `pairId`/`playerId`
(`buildPairViewModels`). `players.json` is the only required file; the rest degrade to
null/empty. Missing MMR or rank ⇒ the field is `null` and the UI renders `—`. A player
with no qualifying pairs still appears in the roster/profiles with an empty pair list.
The history/match archives (`*.<year>.json`) are **never** fetched by the frontend —
they're build-time cold storage (§2.6, §2.8.1).

**Heavy files must never gate a page.** The leaderboard renders from the core files
and fills its movement columns in when the history arrives (§5.3); a page that spins
until a heavy file lands defeats the split.

## 5.3 Leaderboard (core, `/`)

The headline feature (brief §5.1). A sortable board with the **Players ⇄ Pairs
toggle**.

```
C-TOWN  Standings                              [Players | Pairs]
14 players · updated 2h ago
────────────────────────────────────────────────────────────────
 #  Player     Character   Rank        MMR   30d   Form    GP
────────────────────────────────────────────────────────────────
[1] Fop        Reina       Fujin      1642  ^ 21   ●●○●●   83
 2  Burny      Victor      Tenryu     1588     ·   ○●●●●  203
 3  BigMan     Kuma        Garyu      1544  v 32   ○○○○●   89
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
tiebreak. Header click cycles Rank / MMR / movement. Rank and MMR live on the pair
model and sort in `sortPairs`; movement is derived per render, so that sort lives in
`LeaderboardPage` beside the derivation. Unknown movement always sorts last.

**#1 stays in the table.** There is no champion hero. Lifting the leader into a
separate panel meant the top two players could never be compared on the same axis,
which is the one comparison a leaderboard exists to support. The leader is
emphasised in place — filled position block, heavier tag.

**Columns:** position, player (avatar + tag), character, current rank, MMR (subtle
provisional treatment), window movement, recent form, games played. Below the small
breakpoint character and form drop out so the rest fits a phone without a sideways
scroll.

**Movement columns (`src/lib/trends.ts`).** The window is
`config.matches.recentWindowDays`, not a literal — tying it to the feed window is
what keeps games-played and form describing the same span of play. Movement comes
from `mmrhistory.json` / `rankhistory.json`, form and games from `matches.json`.

Two rules matter here:

- **Unknown is not zero.** When a series doesn't reach back past the cutoff the cell
  renders an em dash. A fabricated `0` would claim "did not move", which is a
  different and wrong statement.
- **No-change is quiet.** Wavu's Glicko rating is static for most of the crew most
  of the time (8 of 36 pairs moved over 30 days when this was written), so a literal
  `0` on three quarters of the rows trains the eye to skip the column. No-change
  renders as a hairline; only real movement is typeset.

The board never waits on movement data: it renders from the core files and the cells
fill in, showing a placeholder meanwhile so "loading" cannot read as "no data".

**Accent discipline.** The player identity colour renders only in Pairs view, where
one person holds several rows and the colour groups them. In Players view every row
is a different person, so it would carry no information. The main-character mark
follows the same rule — in Players view every row is already the player's best pair.

Below the board: a **recent-matches strip** (last 12, from `matches.json`).

Components: `LeaderboardTable`, `SegmentedControl`, `SortHeader`, `RankBadge`,
`MmrCell`, `DeltaCell`, `FormPips`, `PlayerAccent`, `LastUpdated`,
`RecentMatchesStrip`.

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

The header is a **tale of the tape** — rank, MMR, record, win rate and peak as one
ruled figure strip, plus recent form — not a grid of bordered stat boxes.

`PlayerH2HTable` lists only opponents actually **played**, most-played first, and
names the never-played remainder in a single line. Listing every roster member
buried real rivalries in a column of em dashes.

Components: `PlayerAccent`, `CharacterName`, `HistoryChart` (shared, rank|mmr mode),
`SegmentedControl`, `FormPips`, `MatchSideLabel`.

## 5.6 Head-to-head (`/h2h`) — gated per site

**Shown only when `config.headToHead.enabled`** (config is baked into each site's
bundle at build time). A site with it off hides the H2H page + nav link _and_ the
profile H2H section — because without ewgf that site gathers no custom-lobby crew
matches to populate them (§4.6, §8). Currently c-town shows it; area-256 doesn't.

- **Crew matrix:** everyone-vs-everyone grid of **match records** (brief §5.3 "full
  crew grid"), reading from `stats.json.headToHead`, tinted on the P1↔P2 diverging
  scale described in §5.8, with a legend.
- **Cell drill-down:** click a cell → `MatchupPanel`, the site's signature element:
  the two players across the seam with their character and rank, and matches/rounds
  in tabular figures.

Components: `MatchupPanel`, `PlayerAccent`. Data loads lazily via `useStats()` /
`useMatches()` (§5.2).

## 5.7 Matches (`/matches`)

Full log from `matches.json` with client-side filters (player, match type, crew-only).
Opponents without a `playerId` are non-crew randoms and render by name (no link). Rows
show each side's character, the rounds score in the versus seam, "concluded X ago",
and match type (quick/ranked from tknow; player/group from ewgf where enabled).
Filters use styled controls (`Select`, `ToggleChip`), not raw browser chrome.

## 5.8 Design system — "versus screen, refined"

This section used to be a pointer saying the design pass would decide. The pass has
happened; this is the system it produced, and it is binding.

### The governing rule

> **P1/P2 is match language, not page language.** Ember (`--p1`) and volt (`--p2`)
> appear only where two players are literally opposed: a match score, a
> head-to-head cell, the matchup panel, the seam. Chrome, board and profile are ink
> on ground, with **rank tier** as the only other hue.

The previous design used the duality as a site-wide accent. That is why it read as
generic neon: when red and blue are everywhere, they signal nothing. Restricting
them is what makes the fighting-game identity legible, and it is also what forces
the light/dark discipline — a versus look that must survive on a light ground cannot
lean on glow or bloom.

### Guardrails

Banned outright: gradients as surface fill · glow/bloom `box-shadow` · clip-path
chamfers · letterspaced all-caps as a default · entrance and fill animations ·
decorative colour · more than one hue on a surface that is not a matchup.

The only carriers of "versus": hard flat colour fields · **a single sheared seam**
(`--vs-shear`, `-8deg`, via `.vs-seam`) where two sides meet · heavy type set tight ·
big tabular figures · asymmetry, with P1 driving into the seam and P2 out of it.

The seam appears in exactly two places — `MatchScore` and the h2h `MatchupPanel`. If
a third use appears, it has stopped being a signal.

### Tokens (`src/styles/tokens.css`)

Light is the `:root` base; `@media (prefers-color-scheme: dark)` overrides the same
names. **No colour may be declared only inside the dark block** — every name must
resolve in the base, or the un-stamped state renders one theme's text on the other
theme's ground.

- Ground is a cool concrete grey, deliberately not warm cream. Volt is a real blue,
  not cyan.
- All twelve rank bands carry both a light and a dark value.
- The player identity palette (`--pl-0` … `--pl-7`, hashed in `src/lib/accent.ts`) is
  muted so it can never out-shout the rank bands, and is rendered only where it
  groups something (§5.3).

Colours must be resolved through the tokens. Three places used to hardcode them —
the chart's series palette and axes, and the h2h cell ramp — and all three are now
token-derived. `HistoryChart` reads the tokens at render time because Recharts takes
concrete strings, and re-reads them when the colour scheme changes.

### Rank colour

The tier hue lives on the **icon**, not the label. The game's own iconography already
encodes the tier; colouring the label as well put twelve competing hues down a
column and pushed the top tier's red onto P1 ember.

### Typography

Two families, not four. **Archivo** carries display and body — contrast comes from
weight, size and case, not from adding families. **IBM Plex Mono** carries every
figure. The `.tabular` class (`font-variant-numeric: tabular-nums`) is mandatory on
any column of numbers: the previous numeral face had proportional figures, so the
MMR column never aligned.

Case is a per-component decision. There is no global `h1,h2,h3 { uppercase }`;
`.eyebrow` is for column headers and small labels only.

### Cascade

Links inherit their surrounding ink; `.link` opts in. The old broad
`a { color: accent-2 }` rule was the sole reason `!important` overrides existed
across six components. **`grep -rn '!text-' src/` must stay empty.**

### Accessibility

The h2h matrix uses a P1↔P2 diverging scale. The previous red-to-green ramp was the
one diverging pair red-green colourblind readers cannot separate. Magnitude rides on
alpha so the hue never shifts, and the matrix carries a legend.

Movement is encoded monochrome — weight and direction, never a green/red pair —
which keeps it colourblind-safe and keeps colour meaning exactly two things on this
site.

## 5.9 Non-goals reminder (brief §3)

No login, no in-browser result submission, no server calls, Tekken 8 only, no
brackets. The app is strictly a reader of static JSON.
