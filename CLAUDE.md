# CLAUDE.md

Guidance for Claude when working in this repository. The [README](README.md) is the source of truth for scope, plan, data design, metrics and UI decisions. Read it before starting a task, and do not duplicate it here.

## Project

Carbon Dash is an analytics dashboard for the UK Carbon Intensity API (`https://api.carbonintensity.org.uk`, no key needed), built with SvelteKit (Svelte 5) and Postgres.

This is also a **learning project**. Each step in the README plan lists the Svelte concepts it is meant to teach, and the README write-up covers how AI tools were used. So the goal is for the owner to understand and be able to explain the code, not just to have it working.

## How we work together

### Ask before changing code

- **Never edit, create, rename or delete project files, or install or remove dependencies, without asking first.** Describe what you intend to change and why, then wait for a clear yes.
- Approval covers the change that was described. If the scope grows, ask again.
- Read-only work (reading files, searching, running `pnpm check`, explaining) does not need approval.
- Never commit, push or open a PR unless asked.
- Do not touch the owner's uncommitted changes (check `git status` first) without saying so.

### Ask questions to make tasks clear

- If a request is ambiguous, ask before starting. Prefer a few focused questions over guessing.
- Check the README first. If it already answers the question (data shapes, UI decisions, scope), use that instead of asking.
- When there are real alternatives, give a short recommendation with the trade-off, not a long survey.
- Flag anything that would pull in stretch work (map, extra metrics, cron ingest) before doing it. MVP first.

### Teach as we go

- Explain the Svelte concept a change uses (for example `$derived` vs `$effect`, `load` functions, snippets) in a sentence or two, and link the matching README plan step.
- Prefer the simplest idiomatic Svelte 5 approach. Use runes (`$state`, `$derived`, `$props`), not legacy `export let` or stores, unless there is a reason.
- Use `$effect` sparingly, and say why when it is the right tool.
- Where the owner is meant to learn by writing something, offer a hint or outline instead of the full solution, and ask which they would prefer.

## Tech stack and commands

- SvelteKit 3, Svelte 5, Vite 8, TypeScript (strict), pnpm
- Postgres with Drizzle, `d3-scale` and `d3-shape` for plain SVG charts, Vitest. No Playwright (dropped from the MVP, see README step 6)
- Check the current `package.json` for what is actually installed. Do not assume planned tools are present.

```bash
pnpm dev          # start the dev server
pnpm check        # svelte-check and type checking (run after changes)
pnpm build        # production build
pnpm preview      # preview the production build
```

Use `pnpm`, never `npm` or `yarn`.

## Project structure

- `src/routes/` pages and layouts (`+page.svelte`, `+layout.svelte`, `+page.server.ts`, `+server.ts`)
- `src/lib/` shared code, imported through the `#lib` alias or `$lib`. Planned sub-folders: `api/` (typed Carbon Intensity client), `components/`, `server/` (database, server-only)
- `docs/` design references such as `wireframe.html`
- `static/` static assets

Keep server-only code (database, secrets, `$env/static/private`) under `src/lib/server/` so it cannot be imported into the browser.

## Code quality

- **Clean, readable code over clever code.** Small functions and components that do one thing, with clear names that say what something is.
- Keep components small. Extract a component when markup repeats or a file does more than one job. Do not extract early.
- No dead code, commented-out code, unused imports or leftover `console.log`.
- No premature abstraction. Do not add options, wrappers or layers that nothing uses yet.
- Type everything. Avoid `any`. Model the API honestly, for example `actual: number | null` because future periods have no actual value.
- Validate data at the boundary (API responses, query params) rather than trusting it deep in the app.
- Handle loading, empty and error states for every data-driven view, and say what the user can do next.
- Keep logic that is easy to test (tier scoring, forecast accuracy, fuel-name mapping) in plain TypeScript functions, apart from components.
- Follow the existing formatting (tabs, as in the current files). Match the surrounding style.
- Constants for magic values (region ID ranges, the 60-minute refresh threshold, the 31-day stats limit).

## Accessibility

Accessibility is a core requirement, not a polish step. Build it in from the start and meet WCAG 2.2 AA.

- Use semantic HTML first: `nav`, `main`, `header`, `section`, `table`, `button`, `a`. Add ARIA only when HTML cannot express it.
- One `h1` per page, with headings in order. Every page has a unique `<title>`. Provide a skip link and landmarks.
- Everything must work with the keyboard alone, with a visible focus style that is never removed. No hover-only interactions. Do not use `div` or `span` as buttons.
- **Never rely on colour alone.** Pair colour with text, an icon or a pattern (index shown as a word plus meter, tiers as icon plus label plus colour). Text contrast at least 4.5:1, and UI components and graphics at least 3:1.
- Every chart needs a text or table alternative, an accessible name, and a readout that does not depend on hovering.
- Announce dynamic updates (such as the region preview panel) with `aria-live`. Manage focus deliberately on navigation and changes.
- Label every form control. Use real `<label>`s and associate error messages with their inputs.
- Respect `prefers-reduced-motion` for transitions and animation, and support zoom to 200% and a mobile layout without horizontal scrolling.
- Svelte's compiler reports a11y warnings. Treat them as errors and fix them rather than ignoring them.
- Verify with an axe or Lighthouse audit (README step 6), and record the results.

## UI and design

The UI should be **simple, modern and visual**: calm and uncluttered, with the data as the focus.

- Clear hierarchy: one main idea per section, generous whitespace, a restrained palette and consistent spacing.
- Use charts, big numbers, badges and small deltas so the data reads at a glance. Follow the visual choices in the README's Visualisations and UI decisions sections (single y-axis from 0, text readout instead of floating tooltips, master-detail regions layout).
- Define design tokens once (CSS custom properties for colour, spacing, radius, type scale) and use them everywhere, rather than hard-coding values in components.
- Support light and dark mode through `prefers-color-scheme`, and keep contrast valid in both.
- Responsive by default, designing mobile first. Use fluid layouts (CSS grid and flexbox) over fixed widths.
- Use scoped component CSS in Svelte. Do not add a UI or CSS framework without asking.
- Keep animation subtle and purposeful, and use Svelte transitions only where they help understanding.
- Use `docs/wireframe.html` as the visual reference where it applies.

## Data and API

- The Carbon Intensity API's rules and quirks (30-minute periods, `actual` null for the future, 31-day stats limit, region IDs 15-18 being aggregates) are documented in the README Data section. Follow them.
- Data flows through our own SvelteKit API and Postgres, with lazy refresh and a single-flight guard (README step 3), rather than having components call the external API directly.
- Never hard-code secrets. Use `$env` modules, and keep a documented `.env.example` once environment variables exist.

## Testing

- Add Vitest tests for pure logic (tier scores, accuracy metrics, API client parsing) alongside the code that introduces it.
- Run `pnpm check` after changes, and run tests when they exist. Report failures honestly with the output, and do not claim something works without having run it.

## Documentation

Good documentation is part of the work, not an afterthought.

- Keep the README plan up to date: tick off steps as they are done, and record decisions (and the reasoning behind them) where the README already keeps them.
- Write comments that explain **why**, not what. Add a short doc comment to exported functions, types and components whose purpose is not obvious from their name.
- Document non-obvious data handling right where it happens (for example the fuel-name mapping, and the tier calculation with `NTILE(3)`).
- Keep a `.env.example`, and setup instructions (install, database, backfill, run) in the README as they come into existence.
- Save screenshots, audit scores and the "what I learned" and "how I used AI tools" notes where the README plan expects them.

## Git

- Small, focused commits with clear messages in the imperative mood ("Add national now card"). One logical change per commit.
- Never commit `.env` files, credentials or `node_modules`.
- Do not rewrite history or force-push without explicit approval.
