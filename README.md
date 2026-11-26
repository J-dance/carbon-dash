# Carbon Dash

An analytics dashboard for the [UK Carbon Intensity API](https://carbon-intensity.github.io/api-definitions/), built with SvelteKit and Postgres.

**Live demo:** https://carbon-dash-jpo6.onrender.com. It runs on a free tier, so the first load after a quiet spell can take about a minute while the server wakes.

## Features

- **National dashboard:** current carbon intensity compared with the 30-day average, the fuel mix, and actual vs forecast intensity over the last 24 hours with a forecast accuracy summary (mean error, bias, share within ±10%).
- **Regions:** the 14 GB regions in a sortable table, ranked into Top, Middle and Bottom tiers, filterable by period (24 hours, 7 or 30 days) and tier. Selecting a region opens a preview panel, with a link to a detail page. Filters and selection live in the URL, so any view can be shared.
- **Accessible:** works with the keyboard alone, every chart has a text readout and a data table, and tiers and index bands never rely on colour alone. Lighthouse accessibility score 100.
- Light and dark theme.

## Tech stack

SvelteKit 3 (Svelte 5, TypeScript), Postgres 17 with Drizzle ORM, plain SVG charts with `d3-scale` and `d3-shape`, and Vitest. Deployed as a Node server (`adapter-node`) on Render, with Neon for Postgres.

## How it works

- **Data:** the API publishes intensity, forecasts and fuel mix in 30-minute periods. The app stores them in Postgres (`regions`, `readings` and `national_intensity`), and pages read from the app's own `/api` endpoints, never from the external API directly.
- **Backfill:** a one-off script (`pnpm db:backfill`) loads the last 90 days, so history-based views work straight away.
- **Lazy refresh, no cron:** when a visit finds the newest stored period more than 60 minutes old, the server fetches what is missing (up to 90 days). Visitors who arrive during a refresh share it, and nobody waits more than 5 seconds. Nothing is fetched while nobody visits. The shared refresh lives in server memory, which is why the app runs as one long-lived Node server rather than serverless.
- **Tiers:** one SQL query averages each region's forecast over the period and splits the regions into thirds with `NTILE(3)`.

The full design, the API quirks it handles and the reasons behind each decision are in [docs/notes.md](docs/notes.md).

## Local setup

Needs Node 26, pnpm and Docker Desktop.

```bash
pnpm install
cp .env.example .env   # local database settings, matches docker-compose.yml
pnpm db:up             # start Postgres 17 in Docker (host port 5433)
pnpm db:migrate        # create the tables and seed the 18 regions
pnpm db:backfill       # load the last 90 days of data (about 30 seconds)
pnpm dev
```

- `pnpm test` runs the Vitest suite. The tier tests use the local database, so Docker must be running and the database migrated.
- `pnpm check` type-checks, and `pnpm db:down` stops the database and keeps its data.

## Deploy

The live demo runs on a Render free web service with a Neon free Postgres database.

**1. Database (Neon).** Create a project and copy its **direct** connection string (connection pooling off), keeping `?sslmode=require`. Then create the tables and load the data from your own machine:

```bash
read -s "DATABASE_URL?Neon connection string: " && export DATABASE_URL
pnpm db:migrate
pnpm db:backfill
```

`read -s` keeps the connection string, which contains the password, off the screen and out of the shell history. Close that terminal afterwards, so later commands use the local database in `.env` again.

**2. Server (Render).** Create a web service from the repository with:

- Build command: `corepack pnpm install --frozen-lockfile && corepack pnpm build`
- Start command: `node build`
- Environment variables: `DATABASE_URL` (the Neon connection string), `ORIGIN` (the service's public URL, such as `https://carbon-dash-jpo6.onrender.com`), `NODE_VERSION=26` and `COREPACK_ENABLE_DOWNLOAD_PROMPT=0`

Every push to `main` redeploys. To try the production build locally first, run `pnpm build`, then `PORT=4180 ORIGIN=http://localhost:4180 node --env-file=.env build`.

## How I used AI tools

I used Claude (in Claude Code) as a pair programmer and reviewer. The project was also a way to learn Svelte 5 and SvelteKit, so the aim was code I understand and can explain.

- **Ground rules:** [CLAUDE.md](CLAUDE.md), written on the first day, sets how Claude works here. It describes each change and waits for my approval before editing or installing anything, explains the Svelte concepts involved, and holds the project's bar for types, accessibility and tests.
- **Who wrote what:** I wrote the parts that teach Svelte, SvelteKit and Postgres, such as lazy refresh, with Claude reviewing and explaining. Claude wrote the rest under my review: layout CSS, refactors, pure TypeScript helpers with their tests, and documentation.
- **What I reviewed:** every proposed change before it was made, and every diff before I committed it.
- **What I tested:** `pnpm check` and the Vitest suite after each change, breaking code on purpose to make sure the tests catch it. Claims about the API were checked against the live API rather than trusted. That is how I found that a period is only published after it ends (so data counts as stale after 60 minutes, not 30), and that regional requests must cover less than 14 days. I also ran the production build locally before deploying, which caught a CSS bug that only appeared in production.
