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
- [ ] **1. Learn the basics and scaffold**
  - [x] Work through the Svelte 5 tutorial (runes, templates, events, bindings) - https://svelte.dev/tutorial
  - [x] Layout, routes and navigation (`+layout.svelte`, `+page.svelte`)
  - [ ] Concepts: `$state`, `$derived`, `$props`, `{#each}`, `{#if}`, snippets
- [ ] **2. API client and first vertical slice**
  - [ ] Typed client for the Carbon Intensity API in `src/lib/api/`
  - [ ] National "now" card: intensity, index badge, renewable %
  - [ ] Concepts: `+page.server.ts` `load`, TypeScript with Svelte, components and props
- [ ] **3. Postgres and my own API**
  - [ ] Schema: `regions`, `readings` and `national_intensity` (see Data design)
  - [ ] Migrations (Drizzle) and a 90-day backfill script
  - [ ] Lazy refresh: re-fetch when the newest reading is over 30 minutes old, with a single-flight guard
  - [ ] `+server.ts` endpoints with query params (range, region, tier)
  - [ ] Tier scores computed in SQL (`NTILE(3)`)
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
  - [ ] Hosted Postgres (Neon or Supabase) and a live demo link
  - [ ] Screenshots, "what I learned", and how I used AI tools (what I reviewed, tested and rejected)

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

| Column | Type | Notes |
|---|---|---|
| `region_id` | smallint, FK to `regions` | Part of the primary key |
| `period_from` | timestamptz | Part of the primary key. `period_to` is always +30 min, so not stored |
| `forecast` | smallint | gCO2/kWh, the regional forecast |
| `index` | text or enum | very low, low, moderate, high, very high. Stored as returned by the API |
| `biomass`, `coal`, `imports`, `gas`, `nuclear`, `other`, `hydro`, `solar`, `wind` | numeric(4,1) | Percent shares of the generation mix |

Primary key (`region_id`, `period_from`) so re-ingesting a period overwrites it. Second index on (`period_from`, `region_id`) for "latest for all regions" and tier queries.

**`national_intensity`**: one row per 30-minute period from the national `/intensity` endpoint.

| Column | Type | Notes |
|---|---|---|
| `period_from` | timestamptz | Primary key |
| `forecast` | smallint | gCO2/kWh, the national forecast |
| `actual` | smallint, nullable | Null until the period has ended |
| `index` | text or enum | As returned by the API |

**Why two tables:** the all-regions endpoint returns GB (region 18), but its forecast is not the same data as the national endpoint. Checked over 13 days (625 periods): the forecast differed in 579 of them, and the index in 29. The regional endpoint also never returns `actual`. So the national call cannot be dropped: it is the only source of `actual`, and forecast accuracy must compare the national forecast with the national actual. Region 18 stays in `readings` for its fuel mix: checked over the same 625 periods, its mix is identical to `/generation`, so the national fuel mix comes from the regional call and no separate `/generation` backfill is needed. Ignore region 18's `forecast` and `index` columns for national analytics (use `national_intensity`).

Optional (stretch only): `intensity_factors` for the emissions-by-fuel metric.

### Size

Estimates, not measured: 48 periods a day x 18 regions. 90 days is about 78k rows (10-15 MB), a year is about 315k rows (40-50 MB). Storage is not a constraint; the 90-day limit is about backfill time and download size.

### Where each metric gets its data

| Metric | Source |
|---|---|
| Renewable / low-carbon / fossil % | Latest fuel mix. The fuel classification (is biomass renewable? imports?) lives in one constants file |
| Cleanest / dirtiest 48h window | Live `fw48h` call, cached for a few minutes. Slide a window (e.g. 2h) over the 97 periods |
| Current vs 30-day average | Stored `national_intensity` |
| Region tier | Average forecast per region over a chosen period, then `NTILE(3)` over regions 1-14 only. 14 regions split 5/5/4, so decide which tier gets the extra region. Needs a tiebreak (see quirks) |
| Region gap | Latest forecast per region |
| Forecast accuracy | `forecast` and `actual` in `national_intensity` |

### Ingest and refresh

- **Backfill:** 90 days, in 14-day chunks, one chunk at a time with a short pause (a few hundred ms). Use the all-regions endpoint (`/regional/intensity/{from}/{to}`, about 4.3 MB per 14 days) rather than per-region calls, plus the national `/intensity` endpoint (31 days per call) into `national_intensity`. About 7 regional and 3 national calls.
- **Lazy refresh (no cron):** when the newest stored period is more than 30 minutes old, fetch and upsert. Re-fetch the last 24-48h every time, because `actual` is filled in after a period ends.
- **Single-flight:** concurrent requests share one in-flight fetch, so a burst of visitors causes one upstream call. Upserts make a duplicate harmless but still wasteful.
- **Being polite to the API:** it is free and keyless, and I found no published rate limit (not tested on purpose). Fetch sequentially, never `Promise.all` across many chunks. Cache live calls (the 48h forecast) for a few minutes and serve with `Cache-Control`, so most reads hit Postgres. Retry with backoff on 429 and 5xx, with a limited number of attempts.

### Data quirks to handle

- `actual` is `null` for future periods and arrives later, so ingest must upsert, not append
- Range queries return one extra period at the start (ask for 00:00, get 23:30 first). Upsert on the primary key handles it
- Fuel order in the JSON is not stable (`{"perc":0,"fuel":"coal"}` vs `{"fuel":"coal","perc":0}`). Parse by key, never by position
- Regional forecasts can be 0 (North Scotland was 0 once), so tiers tie. Use a tiebreak, e.g. renewable share or name
- All timestamps are UTC. Time-of-day profiles (stretch) probably want Europe/London time, so decide up front
- The API keeps one `forecast` per period, so forecast accuracy cannot compare 24h-ahead vs 1h-ahead forecasts unless forecasts are snapshotted repeatedly (out of scope)
- Documented range limits are 14 days for generation and regional ranges, though longer ranges worked in testing. Chunk to 14 days to be safe

## Performance tiers (Top / Middle / Bottom)

Mirrors the performance scores in the job posting. Regions (or time windows) are ranked by forecast carbon intensity over a chosen period (default: last 24 hours) and split into thirds. The lowest third is **Top**, the middle third **Middle**, and the highest third **Bottom**. Shown as a labelled badge (text plus icon, not colour only), and usable for sorting and filtering.

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

| Visual | Metric | Chart type |
|---|---|---|
| "Now" card | Current intensity, index badge, vs 30-day average | Big number, labelled badge, small delta |
| Fuel mix now | Renewable / low-carbon / fossil % | Stacked bar or donut with labels |
| Next 48h | Forecast intensity, cleanest and dirtiest window highlighted | Line chart with highlighted band |
| Last 24h | Actual vs forecast intensity, with forecast accuracy summary (mean error, bias, share within +/-10%) in the card header | Two-line chart (solid actual, dashed forecast) |
| (Stretch) Fuel mix over time | National fuel shares over the last day or week | Stacked area chart (cut from MVP, time is short) |
| (Stretch) Forecast accuracy over time | Forecast vs actual error over time | Line of error |

### Regions (`/regions`, `/regions/[id]`)

| Visual | Metric | Chart type |
|---|---|---|
| Regions table | Forecast intensity, index, tier, renewable % | Sortable, filterable table with tier badges |
| Preview panel (side panel beside the table) | One region's forecast and fuel mix | 48h sparkline plus small stacked bar, with an "Open full detail" link to `/regions/[id]` |
| Region detail | Forecast intensity and fuel mix over time | Line plus stacked area |
| Region gap | Cleanest vs dirtiest region | Summary tile |
| (Stretch) Map | Forecast intensity by region | Choropleth |

Statistics over time (averages, ranges) are drawn from the data stored in Postgres, not just the API's `/stats` endpoint.

### UI decisions

- **Regions layout:** master-detail. On desktop the table is on the left (about 60%) and a sticky preview panel is on the right, so clicking down the table updates the preview without scrolling. On narrow screens the panel stacks below the table. No drawer or modal (avoids focus-trap work), and no hover-only previews (not accessible on touch or keyboard).
- **Selection** is a real button in each row (keyboard reachable) and is synced to the URL (`?region=13`) so it can be shared. The preview panel is an `aria-live` region.
- **Tier period** defaults to the last 24 hours, with a period control (24h / 7 days / 30 days) in a filter row above the table, synced to the URL.
- **Index** is shown as a word plus a 5-step meter, not by colour. **Tiers** use an icon, a label and a colour (never colour alone). Fuel mix is shown as four groups (renewable, nuclear, gas, imports), not nine fuels.
- **Charts** use a single y-axis starting at 0. Hovering a chart shows a text readout above it (time, value, index band) rather than a floating tooltip. Keyboard access to those readouts (arrow keys through points) is to be discussed at implementation time.
