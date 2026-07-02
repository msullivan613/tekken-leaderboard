# 1. Architecture

## 1.1 System overview

A static front end plus one scheduled data pipeline (run once per site), all on
free GitHub infrastructure. Nothing runs a server; JSON files committed to the repo
are the only "database."

```
                    ┌───────────────── GitHub repo (main) ─────────────────┐
                    │                                                       │
 tknow.gg ────┐     │  .github/workflows/online-stats.yml  (cron every 6h)  │
              │     │    for dir in sites/*/ :                               │
 Wavu Wank ───┼────▶│      → sites/<slug>/data/ranks.json    (tknow)        │
 (Glicko-2)   │     │      → sites/<slug>/data/glicko.json   (Wavu)         │
              │     │      → append rankhistory.json / mmrhistory.json      │
 ewgf.gg ─────┘     │      → sites/<slug>/data/matches.json  (tknow+ewgf)   │
 (opt-in H2H)       │      → sites/<slug>/data/stats.json    (derived)      │
                    │                                                       │
 hand edit ────────▶│  sites/<slug>/data/players.json  (roster, committed)  │
                    │                                                       │
                    │  push to main ─▶ deploy.yml ─▶ build ─▶ GitHub Pages   │
                    └───────────────────────────────────────────────────────┘
                                              │
                                              ▼
                    React + Vite SPA per site (reads its own /data/*.json)
```

The refresh job writes all generated JSON under `sites/<slug>/data/` and `git
commit`s the changes. Any commit to `main` that touches the app or its data triggers
`deploy.yml`, which rebuilds every site and publishes them to Pages. The data is
therefore always part of the deployed build — no runtime fetch to a third party, no
CORS, no secrets in the browser.

> **📌 Decision — data lives in `sites/<slug>/data/` and ships with the build.**
> Vite copies the active site's `data/` into `dist/<slug>/data/` at build (and a dev
> middleware serves it straight from disk), so `*.json` is fetchable at runtime via
> `${BASE_URL}data/foo.json`. Single source of truth (the repo), no separate data
> host. The cost is a rebuild per data update, which is free and fast on Actions.

## 1.2 Multi-site model

> **📌 Decision — one codebase (`src/`) renders N independently-deployed sites.**
> The crew grew past one group, so the app is parameterized by a `SITE` env var
> instead of forked. A build produces `dist/<slug>/` per site plus a root
> `dist/index.html` linking to them all.

- **`SITE`** (default `c-town`) selects the active site everywhere: `vite.config.ts`,
  `vitest.config.ts`, `scripts/shared/config.ts`, and `scripts/build-all.ts` all read it.
- Each `sites/<slug>/` has a `config.json` (branding + optional overrides) and a
  `data/` folder (that site's JSON database).
- `public/` holds only **shared** static assets (character icons, avatars) — never data.
- There are currently two sites: `c-town` and `area-256`.

## 1.3 Tech stack

> **📌 Decision — one language (TypeScript) for app _and_ pipelines.**
> Pipeline scripts run under [`tsx`](https://github.com/privatenumber/tsx) and import
> the exact same `@/` modules (`src/types/`, `src/data/`) the frontend uses. A schema
> change is a compile error in both places at once. No Python.

| Concern          | Choice                                                     | Notes                                                      |
| ---------------- | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Language         | TypeScript (strict)                                        | shared types between app + pipelines                       |
| Build / dev      | Vite 5                                                     | fast, first-class GitHub Pages support via `base`          |
| UI               | React 18                                                   | function components + hooks                                |
| Routing          | React Router 6, **HashRouter**                             | see decision below                                         |
| Styling          | Tailwind CSS + CSS custom-property design tokens           | distinctive theme per brief §4.1                           |
| Charts           | [Recharts](https://recharts.org)                           | line charts for rank/MMR history                           |
| Data fetch       | native `fetch` + a small `useJson<T>()` hook               | no React Query needed for static JSON                      |
| Pipeline runtime | Node 20 + `tsx`                                            | run inside GitHub Actions                                  |
| Rank source      | **tknow.gg** JSON API                                      | per-character dan rank + lifetime games; no key            |
| MMR source       | **Wavu Wank** HTML scrape                                  | Glicko μ/σ²; no key                                        |
| Match source     | **tknow** (quick/ranked) + **ewgf** (group/player, opt-in) | no manual entry, no sheet                                  |
| HTML parse       | `node-html-parser`                                         | Wavu scrape against stable class names                     |
| Lint / format    | ESLint + Prettier                                          |                                                            |
| Tests            | Vitest                                                     | pipeline transforms, stats math, committed-data validation |

> **📌 Decision — HashRouter for routing.**
> GitHub Pages has no server-side rewrite, so a deep link like `/player/matt` served
> by `BrowserRouter` 404s on refresh. `HashRouter` (`/#/player/matt`) is zero-config
> and robust for a crew-internal site. Don't switch to `BrowserRouter` without adding
> the `404.html` redirect hack.

## 1.4 Configuration

> **📌 Decision — layered config: shared defaults + per-site overrides.**
> `config/config.json` holds shared tunables; `sites/<slug>/config.json` supplies the
> `site` block and any overrides. `src/lib/config-merge.ts#mergeAppConfig` deep-merges
> them (override wins, arrays replace). **Neither file alone satisfies `AppConfig` —
> only the merged result does.** The frontend imports the merged config as a module
> (baked into the bundle at build time via the `@site-config` alias); pipelines load it
> from disk at runtime via `loadConfig()` so a cron run picks up edits.

Shared defaults — `config/config.json`:

```jsonc
{
  "pairThreshold": {
    "minRankedGames": 10, // a (player,character) pair needs ≥ this many games
    "requireAssignedRank": true, // ...AND a non-null current rank to appear
  },
  "leaderboard": {
    "defaultView": "players", // "players" | "pairs"
    "defaultSort": "mmr", // "rank" | "mmr"
    "bestPairMetric": "mmr", // how "best pair" is chosen for Players view
  },
  "matches": {
    "recentWindowDays": 30, // prune non-crew feed matches older than this
    "feedMaxPerPlayer": 40, // cap of non-crew feed matches kept per player
  },
  "headToHead": {
    "enabled": false, // per-site opt-in; overridden true for c-town
  },
  "sources": {
    "tknowBaseUrl": "https://api.tk8now.pe.kr/api/v1", // §7.9
    "tknowOrigin": "https://www.tknow.gg", // required Origin/Referer (anti-hotlink)
    "wavuProfileUrl": "https://wank.wavu.wiki", // §7.3
    "ewgfBaseUrl": "https://api.ewgf.gg/external", // §8; used only when H2H enabled
  },
  "tknow": { "userAgent": "…crew contact…" },
  "wavu": { "userAgent": "…crew contact…" },
  "ewgf": { "userAgent": "…crew contact…" },
  // EWGF_API_KEY is NOT stored here — it's a GitHub Actions secret (§1.6, §8).
  "history": {
    "granularity": "daily",
    "maxDaysInline": 730, // older points roll into per-year archives (§2.6)
  },
}
```

Per-site — `sites/<slug>/config.json` (the `site` block is required; anything else
overrides a default):

```jsonc
{
  "site": {
    "slug": "c-town",
    "name": "C-Town",
    "description": "The C-Town Tekken 8 scoreboard: ranks, MMR, and head-to-head.",
  },
  "headToHead": { "enabled": true }, // c-town opts in; area-256 leaves it off
}
```

The full merged shape is `AppConfig` in `src/types/data-files.ts`.

## 1.5 Repository layout

```
tekken-leaderboard/
├── PROJECT-BRIEF.md
├── CLAUDE.md                     # current-state orientation (trust over spec on drift)
├── spec/                         # these docs
├── config/
│   └── config.json               # shared tunables (§1.4)
├── sites/
│   ├── c-town/
│   │   ├── config.json           # branding + overrides (H2H on)
│   │   └── data/                 # THE database for this site — committed JSON
│   │       ├── players.json      # hand-maintained roster
│   │       ├── ranks.json        # generated: tknow
│   │       ├── glicko.json       # generated: Wavu
│   │       ├── rankhistory.json  # generated: append-only, bounded (§2.6)
│   │       ├── mmrhistory.json   # generated: append-only, bounded (§2.6)
│   │       ├── matches.json      # generated: tknow(+ewgf) battles, bounded feed (§2.8)
│   │       ├── matches.<year>.json  # generated: cold-storage archive (appears only past the window)
│   │       └── stats.json        # generated: derived from matches (§2.9)
│   └── area-256/                 # same shape, H2H off
├── public/                       # SHARED static assets only (icons, avatars) — no data
├── src/
│   ├── main.tsx
│   ├── App.tsx                   # HashRouter + layout
│   ├── types/                    # shared TS types (frontend + pipeline)
│   │   ├── domain.ts             # Player, Platform, CharacterSlug, makePairId…
│   │   └── data-files.ts         # shape of each *.json file + AppConfig
│   ├── data/
│   │   ├── characters.ts         # canonical character list + name⇄slug
│   │   ├── ranks.ts              # Tekken 8 rank ladder + colors/icons
│   │   ├── useJson.ts            # cached fetch hook
│   │   └── DataProvider.tsx      # loads core files; lazy hooks for heavy files (§5.2)
│   ├── lib/
│   │   ├── leaderboard.ts        # players⇄pairs collapse, sorting, best-pair, main derivation
│   │   ├── config-merge.ts       # mergeAppConfig (§1.4)
│   │   └── format.ts
│   ├── pages/                    # LeaderboardPage, PlayerProfilePage, HeadToHeadPage, MatchesPage, NotFound
│   ├── components/               # reusable UI
│   └── styles/
├── scripts/
│   ├── build-all.ts              # multi-site build → dist/<slug>/ + root index
│   ├── online-stats/
│   │   ├── index.ts              # orchestrates the per-site refresh job
│   │   ├── tknow.ts              # tknow client: player info (rank) + match history
│   │   ├── wavu.ts               # Wavu Wank scrape → Glicko MMR
│   │   ├── ewgf.ts               # ewgf client: group/player matches (opt-in, §8)
│   │   ├── matches.ts            # battles → matches (dedup/classify/retain/archive)
│   │   ├── history.ts            # append + bound history; roll overflow to yearly files
│   │   ├── stats.ts              # derive head-to-head / win rates
│   │   └── resolve-id.ts         # manual helper: verify a tekken_id on tknow
│   └── shared/
│       ├── config.ts             # SITE, DATA_DIR, loadConfig() (§1.4)
│       ├── http.ts               # fetch helpers (retry/backoff, sleep)
│       └── atomicWrite.ts        # write + stable-sort + pretty-print JSON (§determinism)
├── .github/workflows/
│   ├── online-stats.yml
│   └── deploy.yml
├── vite.config.ts               # base=/<repo>/<site>/, @site-config alias, data copy/serve
├── vitest.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

## 1.6 Deploy model & secrets

- `deploy.yml` triggers on `push` to `main` (paths: `src/**`, `public/**`,
  `config/**`, `sites/**`, `scripts/**`, `index.html`, build config). It runs
  `npm ci && npm test && npm run build` and publishes `dist/` with
  `actions/deploy-pages`.
- Vite `base` is `/${PAGES_REPO}/${SITE}/` (repo defaults to `tekken-leaderboard`) so
  asset + data URLs resolve under the Pages sub-path. Data is fetched via
  `import.meta.env.BASE_URL`.
- `online-stats.yml` commits to `main`, which fires `deploy.yml`. No infinite loop:
  each run **only commits when generated JSON actually changed** (§determinism, §3.5),
  and the deploy is path-filtered.

**Secrets:** only one, optional, never in the browser:

- **`EWGF_API_KEY`** — GitHub Actions repository secret. Needed _only_ for a site
with `headToHead.enabled: true` (currently just c-town) to gather group/player
matches from ewgf's public API (§8). `online-stats.yml` passes it as an env var to
the pipeline; the pipeline runs in Actions and commits only derived JSON, so the key
stays server-side. If it's absent, everything else still works — that site simply
gathers no custom-lobby matches. tknow and Wavu need **no** secret.
</content>
