# Carbon Dash

An analytics dashboard for the [UK Carbon Intensity API](https://carbon-intensity.github.io/api-definitions/), built with SvelteKit and Postgres.

**In scope (MVP)**

- National dashboard: current intensity, renewable %, history and forecast charts, fuel mix
- Regions table: sortable and filterable, with Top/Middle/Bottom tier scores
- Preview panel for a region (sparkline, fuel mix, forecast) without leaving the table
- Postgres storage behind my own SvelteKit API, with a 90-day backfill and lazy refresh (see Data design)
- Forecast accuracy view

**Stretch (planned for, but not implemented unless the MVP is finished early)**

- Interactive map of regions
- Stretch metrics listed under Metrics (time-of-day profile, volatility, index distribution, rank movement, emissions by fuel)
- Scheduled ingest (cron) instead of lazy refresh, and longer history than 90 days

## Plan

Each step lists the Svelte concepts it is meant to teach.

- [x] Set up SvelteKit project
- [x] **1. Learn the basics and scaffold**
  - [x] Work through the Svelte 5 tutorial (runes, templates, events, bindings) - https://svelte.dev/tutorial
  - [x] Layout, routes and navigation (`+layout.svelte`, `+page.svelte`)
  - [x] Concepts: `$state`, `$derived`, `$props`, `{#each}`, `{#if}`, snippets
- [x] **2. API client and first vertical slice**
  - [x] Typed client for the Carbon Intensity API in `src/lib/api/`
  - [x] National "now" card: intensity, index badge, renewable %
  - [x] Concepts: `+page.server.ts` `load`, TypeScript with Svelte, components and props
- [ ] **3. Postgres and my own API**
  - [x] Postgres in Docker and Drizzle setup
  - [x] Schema: `regions`, `readings` and `national_intensity` (see Data design)
  - [x] Migrations (Drizzle), with the 18 regions seeded by migration `0001`
  - [x] 90-day backfill script (see Backfill)
  - [x] Lazy refresh: re-fetch when the newest reading is over 60 minutes old, with a single-flight guard (`refreshIfStale` in `src/lib/server/ingest/lazyRefresh.ts`, built and tested; the endpoints below call it)
  - [ ] `+server.ts` endpoints with query params (range, region, tier)
    - [x] `GET /api/regions` (`range`, `tier`): the 14 regions with their tiers, used by the regions page
    - [x] `GET /api/national`: the latest period's intensity, the GB fuel mix and the 30-day average, used by the home page. Both endpoints call `refreshIfStale` first and say whether the data is still stale
    - [ ] `GET /api/national/history?range=`: stored actual vs forecast, with the accuracy summary
    - [ ] `GET /api/regions/[id]`: one region's latest values and series, for the preview panel
  - [x] Tier scores computed in SQL (`NTILE(3)`): `regionTiers` in `src/lib/server/db/tiers.ts`, tested against the local database (see Performance tiers)
  - [ ] Concepts: server routes, `$env`, `$lib`, form actions if needed
- [ ] **4. National dashboard charts**
  - [ ] Actual vs forecast (24h back, 48h forward), fuel mix, and the forecast accuracy view, as plain SVG using `d3-scale` and `d3-shape`
  - [ ] Concepts: `$derived` for scales and paths, transitions, `$effect` (sparingly)
- [ ] **5. Regions table and preview** (closest match to the job)
  - [ ] Sortable, filterable table with tier badges
  - [ ] Filters synced to URL query params (date range, tier, fuel source)
  - [ ] Preview panel with sparkline, fuel mix and forecast
  - [ ] Concepts: dynamic routes (`/regions/[id]`), `$app/state` and `goto`, shared state in a `.svelte.ts` module, `<svelte:boundary>`
- [ ] **6. Accessibility, tests and feedback**
  - [ ] Keyboard navigation, focus states, `aria` labels, text/table alternative for each chart, tier not shown by colour alone
  - [ ] axe / Lighthouse audit, record scores
  - [ ] Vitest for tier logic and API client, one Playwright smoke test
  - [ ] Show 2-3 people the app, write up what they struggled with, make one visible change
- [ ] **7. Deploy and write up**
  - [ ] Hosted Postgres (Neon free) on a free Node host, and a live demo link (see Hosting)
  - [ ] Screenshots, "what I learned", and how I used AI tools (what I reviewed, tested and rejected)

## Local setup

Needs Node, pnpm and Docker Desktop.

```bash
pnpm install
cp .env.example .env   # local database settings, matches docker-compose.yml
pnpm db:up             # start Postgres 17 in Docker (host port 5433)
pnpm db:migrate        # create the tables and seed the 18 regions
pnpm db:backfill       # load the last 90 days of data (about 30 seconds, see Backfill)
pnpm dev
```

- `pnpm db:down` stops the database and keeps its data. `docker compose down -v` also deletes the data, which gives a fresh empty database (run `pnpm db:up` and `pnpm db:migrate` again afterwards).
- Postgres uses host port 5433 so it does not clash with a Postgres already running on 5432 (for example from Homebrew).
- `pnpm db:migrate` applies only the migrations in `drizzle/` that this database has not run yet. Migration `0001` inserts the regions, so they are static reference data copied from the API's `/regional` endpoint, not fetched at runtime.
- `pnpm db:studio` opens Drizzle Studio to browse the tables.
- `pnpm test` runs the Vitest tests. `src/lib/server/db/tiers.test.ts` runs against the real local Postgres, so it **needs Docker running** and the database up and migrated (`pnpm db:up`, `pnpm db:migrate`). Without that it fails with a connection error. It only writes rows dated 2030 and deletes them afterwards, so it does not touch real data. The other test files need no database.

## Backfill

`pnpm db:backfill` fills the database with the last 90 days of data, so the app has history to work from straight away (the 30-day average, the 7 and 30 day tier periods, forecast accuracy). The code is in `scripts/backfill.ts`, with the fetching and storing in `src/lib/server/ingest/`.

### What it does

1. Splits the last 90 days into chunks of at most 13 days. The API rejects a regional range of 14 days or more with a 400, so 13 is the safe size (see Data quirks).
2. For each chunk, one after the other with a 0.5 second pause between chunks: fetches all 18 regions (`/regional/intensity/{from}/{to}`) and the national intensity (`/intensity/{from}/{to}`).
3. Validates each response in the API client (`src/lib/api/`), then upserts the rows into `readings` and `national_intensity`, in batches of 1,000 because Postgres allows only 65,534 parameters per statement.
4. Retries a chunk after 1, 2 and 4 seconds if the API answers 429 or a 5xx, then gives up and stops with the error.

For 90 days it stores 77,760 `readings` rows (18 regions x 4,320 periods) and 4,320 `national_intensity` rows, in about 30 seconds. Both endpoints use the same 13-day chunks, so it makes about 14 requests, not the 7 + 3 first planned: one chunk size keeps `ingestRange` simple and the extra national calls are small.

### When it runs

**Only when you run it. Nothing triggers it** (no deploy hook, no cron, and the app never calls it). It is a one-off setup step for each database:

- **Local:** the first time you set up, after `pnpm db:migrate` (see Local setup). It is not needed again unless you reset the database with `docker compose down -v`.
- **Production (step 7):** once, from your own machine, against the hosted database. Run `pnpm db:migrate` first, then the backfill, with `DATABASE_URL` set to the hosted connection string for that one command (do not put it in a committed file). It runs from your machine rather than the host because it takes longer than many hosts allow a request to run.

After that, **lazy refresh keeps the data current** (see Data design, Ingest and refresh): a visit that finds the newest period more than 60 minutes old re-fetches from the newest stored period, or the last 48 hours if that is more recent. It fills gaps of up to 90 days by itself, in pieces, in the background if it takes longer than 5 seconds (about 30 seconds for a full 90 days). Run the backfill again only for a gap longer than 90 days, or after resetting the database.

### How to run it

```bash
pnpm db:up        # Docker Desktop must be running
pnpm db:migrate   # the regions must exist first: readings.region_id points at them
pnpm db:backfill
```

- It needs `tsx`, a dev dependency that runs a TypeScript file directly. It is not part of the deployed app. `pnpm install` is enough to get it.
- `--env-file=.env` in the `db:backfill` script loads `DATABASE_URL` from the gitignored `.env`, so the script holds no credentials.
- The script runs outside SvelteKit, so it cannot use `$app/env/private` or `$lib`. It makes its own connection from `process.env.DATABASE_URL`, like `drizzle.config.ts`.
- **Safe to run again.** Each row is keyed on its region and period (the primary key), so a repeat run overwrites rows instead of adding duplicates. Run twice, the row counts stay the same.
- To change how far back it goes, change `BACKFILL_DAYS` in `scripts/backfill.ts`. The chunking does not change.
- If it fails with an error about `readings_region_id_regions_id_fk`, the regions are missing: run `pnpm db:migrate`. If it fails right away with a connection error, Docker or the database is not running.

## Hosting

**Decision (2026-11-19):** one long-lived Node server (SvelteKit `adapter-node`) on free hosting. Not serverless, and no scheduled ingest.

**Why**

- It has to be free to run, and it may sit unvisited for weeks or months. Scheduled calls would hit the API for nobody, so data is refreshed only when someone visits.
- Lazy refresh keeps its guard and cooldown in memory, which is only reliable in one long-lived process. Serverless runs many separate copies of the code, and each copy would have its own guard.
- Long quiet periods are expected, so the refresh catches up after a gap (up to 90 days) in the background. A short-lived serverless request could not do that.
- The job posting does not mention serverless or Cloudflare, and the extra infrastructure would take time from what the project is meant to show (Svelte, accessibility, charts, tests).

**Candidates for step 7.** The prices and limits below come from third-party sources and have not been checked on the providers' own pages, so confirm them before relying on them.

- **Server:** a Render free web service, which sleeps after 15 minutes without traffic, so the first visitor after a quiet spell waits roughly 30-60 seconds. An always-on option at about $5-7 a month (Railway Hobby, Render Starter or a small VPS) avoids that.
- **Database:** Neon free. Its compute sleeps when idle and wakes in a fraction of a second, and the data is kept. Avoid Supabase free: it is reported to pause a project after a week of inactivity, and a paused project has to be restarted by hand.

**If I deployed on serverless.** `readStoredState`, `isStale` and `ingestRange` stay as they are. These change:

- The in-memory guard and cooldown become a claim in Postgres: a one-row table updated with a conditional `UPDATE ... WHERE last_attempt_at < now() - interval '1 minute'`, where whoever changes the row does the refresh.
- Visitors who lose the claim cannot wait for the winner, because separate instances cannot share a promise. They get the stored data and an "updating" status.
- The refresh has to stay short, because the platform limits time and outbound requests per call. No long catch-ups: cap a gap at 13 days and leave older gaps to the backfill.
- The database connection has to be pooled or HTTP-based (for example Hyperdrive or Neon's serverless driver), not a plain `postgres` connection per call.

## Sections

- Overview UK dashboard (landing page)
- Regions table and regional detail

## Data

Using the Intensity API (`https://api.carbonintensity.org.uk`, no key needed). Data is in 30-minute periods. Verified against the live API.

- Get carbon intensity national: forecast, actual, index
  - can retrieve for current period or any past one (e.g. `/intensity/date/{date}`, `/intensity/{from}/{to}`)
  - forecast: `/intensity/{from}/fw48h` (next 48h) and `/intensity/{from}/pt24h` (past 24h)
  - `actual` is `null` for future periods, so types need `number | null`
  - what are intensity factors?? `/intensity/factors` gives gCO2/kWh per fuel type (e.g. coal 937, gas CCGT 394, wind/solar/nuclear/hydro 0)
    - factor names are more detailed than generation mix fuels ("Gas (Combined Cycle)", "Dutch Imports" vs "gas", "imports"), so they need mapping before use
- Get carbon intensity statistics for nation over a date range
  - `/intensity/stats/{from}/{to}`: any range up to 31 days (longer returns a 400 error)
  - max, average, min, index
- Generation mix: get electricity fuel source distribution: fuel source % list
  - current period: `/generation`; history: `/generation/{from}/{to}`
  - fuels: biomass, coal, imports, gas, nuclear, other, hydro, solar, wind
- Get regional data: specific regions using defined ids e.g london = 13
  - ids 1-14 are the distribution network regions; 15 = England, 16 = Scotland, 17 = Wales, 18 = GB (so Great Britain, not the whole UK). Exclude 15-18 when ranking regions.
  - `/regional` (all, current), `/regional/regionid/{id}`, and `/regional/intensity/{from}/fw48h/regionid/{id}` for forecasts
  - returns both intensity data (`forecast` and `index`) and generation mix but not "actual" intensity values like national

## Data design

### Tables

**`regions`** (reference): `id`, `short_name`, `dno_name`, `kind` (`dno | nation | gb`). Ids 1-14 are `dno`, 15-17 are `nation`, 18 is `gb`.

**`readings`**: one row per region per 30-minute period (not a snapshot of when it was fetched). Rows are updated in place when `actual` arrives later.

| Column                                                                            | Type                      | Notes                                                                   |
| --------------------------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------------------- |
| `region_id`                                                                       | smallint, FK to `regions` | Part of the primary key                                                 |
| `period_from`                                                                     | timestamptz               | Part of the primary key. `period_to` is always +30 min, so not stored   |
| `forecast`                                                                        | smallint                  | gCO2/kWh, the regional forecast                                         |
| `index`                                                                           | enum                      | very low, low, moderate, high, very high. Stored as returned by the API |
| `biomass`, `coal`, `imports`, `gas`, `nuclear`, `other`, `hydro`, `solar`, `wind` | numeric(4,1)              | Percent shares of the generation mix                                    |

Primary key (`region_id`, `period_from`) so re-ingesting a period overwrites it. Second index on (`period_from`, `region_id`) for "latest for all regions" and tier queries.

**`national_intensity`**: one row per 30-minute period from the national `/intensity` endpoint.

| Column        | Type               | Notes                           |
| ------------- | ------------------ | ------------------------------- |
| `period_from` | timestamptz        | Primary key                     |
| `forecast`    | smallint           | gCO2/kWh, the national forecast |
| `actual`      | smallint, nullable | Null until the period has ended |
| `index`       | enum               | As returned by the API          |

**Why two tables:** the all-regions endpoint returns GB (region 18), but its forecast is not the same data as the national endpoint. Checked over 13 days (625 periods): the forecast differed in 579 of them, and the index in 29. The regional endpoint also never returns `actual`. So the national call cannot be dropped: it is the only source of `actual`, and forecast accuracy must compare the national forecast with the national actual. Region 18 stays in `readings` for its fuel mix: checked over the same 625 periods, its mix is identical to `/generation`, so the national fuel mix comes from the regional call and no separate `/generation` backfill is needed. Ignore region 18's `forecast` and `index` columns for national analytics (use `national_intensity`).

Optional (stretch only): `intensity_factors` for the emissions-by-fuel metric.

### Size

Estimates, not measured: 48 periods a day x 18 regions. 90 days is about 78k rows (10-15 MB), a year is about 315k rows (40-50 MB). Storage is not a constraint; the 90-day limit is about backfill time and download size.

### Where each metric gets its data

| Metric                            | Source                                                                                                                                                                                      |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Renewable / low-carbon / fossil % | Latest fuel mix. The fuel classification (is biomass renewable? imports?) lives in one constants file                                                                                       |
| Cleanest / dirtiest 48h window    | Live `fw48h` call, cached for a few minutes. Slide a window (e.g. 2h) over the 97 periods                                                                                                   |
| Current vs 30-day average         | Stored `national_intensity`                                                                                                                                                                 |
| Region tier                       | Average forecast per region over a chosen period, then `NTILE(3)` over regions 1-14 only. 14 regions split 4/5/5, ties broken by region name (see Performance tiers)                        |
| Region gap                        | Latest forecast per region                                                                                                                                                                  |
| Forecast accuracy                 | `forecast` and `actual` in `national_intensity`                                                                                                                                             |

### Ingest and refresh

- **Backfill:** 90 days, in 13-day chunks, one chunk at a time with a short pause (500 ms). Use the all-regions endpoint (`/regional/intensity/{from}/{to}`, about 4.7 MB per 13 days) rather than per-region calls, plus the national `/intensity` endpoint into `national_intensity`, using the same chunks. About 7 regional and 7 national calls. See Backfill.
- **Lazy refresh (no cron):** `refreshIfStale` in `src/lib/server/ingest/lazyRefresh.ts`. When the newest stored `national_intensity` period started more than 60 minutes ago, it fetches and upserts. Nothing is fetched while nobody visits, which matters for a project that may sit unvisited for months.
  - **Why 60 minutes, not 30:** the API only serves a period once it has ended (checked against the live API on 2026-11-20: at 15:15 UTC a range ending 15:20 stopped at the 14:30-15:00 period). So the newest period available has always started 30 to 60 minutes ago. A 30-minute limit was always exceeded, so every visit looked stale and tried a refresh, and the page would show "data from ..." even with the freshest data there is. Over 60 minutes means a whole period is missing. Not measured: how long after a period ends the API publishes it. If there is a delay, `isStale` is true for a few minutes after each period ends, which costs at most one refresh a minute (the cooldown).
  - **What it fetches:** the last 48 hours (`actual` is filled in after a period ends), or from the newest stored period if that is older. Without that, a visit after a quiet spell would leave a hole behind data that then looks fresh. It reaches back at most 90 days, the same as the backfill, in pieces of 13 days (the API's range limit) with a 0.5 second pause between them. A gap longer than 90 days, or an empty database, needs `pnpm db:backfill`.
  - **Single-flight:** visitors who arrive during a refresh share it, so a burst of visitors causes one upstream call. The guard is a variable in the server process, so it relies on the app running as one long-lived server (see Hosting). Upserts keep a duplicate fetch harmless (rows are keyed on region and period), but it would still waste a call.
  - **Cooldown:** at most one attempt a minute, counted from when the last attempt ended. A failing API is then not hit by every visitor, a slow attempt is not retried the moment it fails, and nothing is refetched over and over when the API has not published the newest period yet.
  - **Waiting:** a visitor waits at most 5 seconds. After that they get the stored data and the refresh carries on in the background, so the next visitor gets the new data. The API client's own timeout is 60 seconds per range request, so without this limit one hung request would hold up everyone.
  - **Failure:** a failed refresh is logged, and the stored data is used.
  - **What it returns:** a `StoredState` (`newestPeriod`, `isStale`). It describes the data after the attempt, not whether the attempt worked, because the page shows the same thing either way: a "data from ..." note when `isStale` is true.
- **Being polite to the API:** it is free and keyless, and I found no published rate limit (not tested on purpose). Fetch sequentially, never `Promise.all` across many chunks. Cache live calls (the 48h forecast) for a few minutes and serve with `Cache-Control`, so most reads hit Postgres. Retry with backoff on 429 and 5xx, with a limited number of attempts.

### Data quirks to handle

- `actual` is `null` for future periods and arrives later, so ingest must upsert, not append
- Range queries return one extra period at the start (ask for 00:00, get 23:30 first). Upsert on the primary key handles it
- Fuel order in the JSON is not stable (`{"perc":0,"fuel":"coal"}` vs `{"fuel":"coal","perc":0}`). Parse by key, never by position
- Regional forecasts can be 0 (North Scotland was 0 once), so tiers tie. Use a tiebreak, e.g. renewable share or name
- All timestamps are UTC. Time-of-day profiles (stretch) probably want Europe/London time, so decide up front
- The API keeps one `forecast` per period, so forecast accuracy cannot compare 24h-ahead vs 1h-ahead forecasts unless forecasts are snapshotted repeatedly (out of scope)
- The regional range limit is documented as 14 days, and a range of exactly 14 days is rejected with a 400 ("greater than 14 days"), while 13 days 23 hours 30 minutes worked (checked against the live API). The response includes the period before the start, which is probably why. Chunk to 13 days. The national range worked at 14 days, and its documented limit is 31

## Performance tiers (Top / Middle / Bottom)

Mirrors the performance scores in the job posting. Regions (or time windows) are ranked by forecast carbon intensity over a chosen period (default: last 24 hours) and split into thirds. The lowest third is **Top**, the middle third **Middle**, and the highest third **Bottom**. Shown as a labelled badge (text plus icon, not colour only), and usable for sorting and filtering.

**How it is computed (decided 2026-11-20).** `regionTiers` in `src/lib/server/db/tiers.ts` averages each region's `forecast` over the window, then ranks and splits with `NTILE(3)`. It is one SQL query, so the database does the ranking.

- **Only regions 1-14** (`kind = 'dno'`). England, Scotland, Wales and GB overlap them, so ranking them too would count the same electricity twice.
- **Tiers are relative.** The split is always the same, whatever the numbers are, so the table shows the average beside the tier and "Bottom" does not read as "bad".
- **Bottom gets the extra region.** 14 does not divide by 3, and `NTILE` gives leftover rows to the first buckets. Ranking dirtiest first makes bucket 1 the Bottom tier, so the split is Bottom 5, Middle 5, Top 4.
- **Ties break on region name.** North Scotland has averaged 0, so ties happen. Without a second sort column, tied regions could land in different tiers from one request to the next.
- **Tests** run against the real local Postgres (they need Docker, see Local setup), because the ranking happens in the SQL and a fake database would test nothing.

## Metrics

Raw API values are only the starting point. The more interesting analytics are derived from them, and several need data stored in Postgres over time, which is what justifies the database.

**MVP**

- **Renewable % vs low-carbon % vs fossil %**: wind + solar + hydro (+ biomass) vs adding nuclear vs gas + coal. Derived from the generation mix.
- **Cleanest / dirtiest window in the next 48h**: "best time to use electricity". Plain-language and useful for editorial users.
- **Current vs 30-day average**: how much cleaner or dirtier than normal right now (from stored readings).
- **Region tier and rank** (Top/Middle/Bottom): see below.
- **Gap between cleanest and dirtiest region**: shows how much location matters.
- **Forecast accuracy**: forecast vs actual error over time (national only, since regions have no `actual`). The API history already returns both values for past periods, so the backfill in step 3 gives enough data straight away. Measures: mean absolute error (gCO2/kWh), bias (over or under forecasting), and share of periods within +/-10%.

**Stretch (needs stored history, computed in SQL from the `readings` and `national_intensity` tables; not implemented unless the MVP is finished early)**

- **Time-of-day profile**: average intensity by hour, split weekday/weekend.
- **Volatility**: spread (standard deviation) of intensity per day or region.
- **Index distribution**: share of time spent in each band (very low to very high).
- **Rank movement**: how a region's tier changed week on week.
- **Emissions contribution by fuel**: fuel share x intensity factor, to show which fuels drive the number (needs the fuel-name mapping above).

## Visualisations

There are 3 areas of data: intensity, statistics (time comparison) and generation mix. Each chart below is tied to a metric above, and every chart needs a text or table alternative for accessibility.

### National dashboard (`/`)

| Visual                                | Metric                                                                                                                  | Chart type                                       |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| "Now" card                            | Current intensity, index badge, vs 30-day average                                                                       | Big number, labelled badge, small delta          |
| Fuel mix now                          | Renewable / low-carbon / fossil %                                                                                       | Stacked bar or donut with labels                 |
| Next 48h                              | Forecast intensity, cleanest and dirtiest window highlighted                                                            | Line chart with highlighted band                 |
| Last 24h                              | Actual vs forecast intensity, with forecast accuracy summary (mean error, bias, share within +/-10%) in the card header | Two-line chart (solid actual, dashed forecast)   |
| (Stretch) Fuel mix over time          | National fuel shares over the last day or week                                                                          | Stacked area chart (cut from MVP, time is short) |
| (Stretch) Forecast accuracy over time | Forecast vs actual error over time                                                                                      | Line of error                                    |

### Regions (`/regions`, `/regions/[id]`)

| Visual                                      | Metric                                       | Chart type                                                                               |
| ------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Regions table                               | Forecast intensity, index, tier, renewable % | Sortable, filterable table with tier badges                                              |
| Preview panel (side panel beside the table) | One region's forecast and fuel mix           | 48h sparkline plus small stacked bar, with an "Open full detail" link to `/regions/[id]` |
| Region detail                               | Forecast intensity and fuel mix over time    | Line plus stacked area                                                                   |
| Region gap                                  | Cleanest vs dirtiest region                  | Summary tile                                                                             |
| (Stretch) Map                               | Forecast intensity by region                 | Choropleth                                                                               |

Statistics over time (averages, ranges) are drawn from the data stored in Postgres, not just the API's `/stats` endpoint.

### UI decisions

- **Regions layout:** master-detail. On desktop the table is on the left (about 60%) and a sticky preview panel is on the right, so clicking down the table updates the preview without scrolling. On narrow screens the panel stacks below the table. No drawer or modal (avoids focus-trap work), and no hover-only previews (not accessible on touch or keyboard).
- **Selection** is a real button in each row (keyboard reachable) and is synced to the URL (`?region=13`) so it can be shared. The preview panel is an `aria-live` region.
- **Tier period** defaults to the last 24 hours, with a period control (24h / 7 days / 30 days) in a filter row above the table, synced to the URL.
- **Index** is shown as a word plus a 5-step meter, not by colour. **Tiers** use an icon, a label and a colour (never colour alone). Fuel mix is shown as four groups (renewable, nuclear, gas, imports), not nine fuels.
- **Charts** use a single y-axis starting at 0. Hovering a chart shows a text readout above it (time, value, index band) rather than a floating tooltip. Keyboard access to those readouts (arrow keys through points) is to be discussed at implementation time.
