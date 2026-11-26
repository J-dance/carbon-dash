<script lang="ts">
	import { page } from "$app/state";
	import { RANGE_PHRASES, type Range, type RegionTier } from "#lib/regions/types.ts";
	import { withParam } from "#lib/url.ts";
	import { indexForIntensity } from "#lib/metrics/intensity-index.ts";
	import IndexBadge from "./IndexBadge.svelte";
	import TierBadge from "./TierBadge.svelte";
	import {
		sortRegions,
		type SortDirection,
		type SortKey,
	} from "#lib/regions/sort.ts";

	let {
		regions,
		range,
		selectedId,
	}: {
		regions: RegionTier[];
		range: Range;
		/** The region chosen with ?region=, or null when none is. */
		selectedId: number | null;
	} = $props();

	const COLUMN_LABELS: Record<SortKey, string> = {
		name: "Region",
		forecast: "Average forecast (gCO2/kWh) and index",
		tier: "Tier",
	};

	// The endpoint returns the cleanest region first, so this default looks the same as
	// the unsorted table.
	let sortKey = $state<SortKey>("forecast");
	let sortDirection = $state<SortDirection>("asc");

	const sorted = $derived(sortRegions(regions, sortKey, sortDirection));

	// The same words a screen reader gets from aria-sort, shown as text under the filters.
	const sortStatus = $derived(
		`Sorted by ${COLUMN_LABELS[sortKey]}, ${sortDirection === "asc" ? "ascending" : "descending"}.`,
	);

	// Clicking the active column flips the direction. Clicking another column starts it
	// from the top.
	function sortBy(key: SortKey) {
		if (key === sortKey) {
			sortDirection = sortDirection === "asc" ? "desc" : "asc";
		} else {
			sortKey = key;
			sortDirection = "asc";
		}
	}

	// Only the sorted column has aria-sort. `undefined` leaves the attribute off.
	function ariaSortFor(key: SortKey): "ascending" | "descending" | undefined {
		if (key !== sortKey) return undefined;
		return sortDirection === "asc" ? "ascending" : "descending";
	}
</script>

{#snippet sortHeader(key: SortKey, className?: string)}
	<th scope="col" class={className} aria-sort={ariaSortFor(key)}>
		<button type="button" onclick={() => sortBy(key)}>
			{COLUMN_LABELS[key]}
			<!-- aria-sort and the button itself already tell screen readers this, so the icons are hidden from them. -->
			{#if key === sortKey}
				<span aria-hidden="true">{sortDirection === "asc" ? "▲" : "▼"}</span>
			{:else}
				<span aria-hidden="true" class="idle-icon">↕</span>
			{/if}
		</button>
	</th>
{/snippet}

<!-- Only the status span is live, so the hint is not read out again after every sort. -->
<p class="sort-status">
	<span role="status">{sortStatus}</span>
	Select a column heading to change the sort.
</p>

<table>
	<caption>
		Carbon intensity by region, ranked over {RANGE_PHRASES[range]}. Top is the
		cleanest third.
	</caption>
	<thead>
		<tr>
			{@render sortHeader("name")}
			{@render sortHeader("forecast", "number")}
			{@render sortHeader("tier")}
		</tr>
	</thead>
	<tbody>
		<!-- The key lets Svelte match each row to its region when the data changes. -->
		{#each sorted as region (region.regionId)}
			{@const selected = region.regionId === selectedId}
			<tr class:selected>
				<th scope="row">
					<!-- A link, not a button: choosing a region changes the URL, and a link works before
					     JavaScript loads. reset="false" keeps scroll position and keyboard focus. -->
					<a
						href={withParam(page.url.search, "region", String(region.regionId))}
						aria-current={selected ? "true" : undefined}
						data-sveltekit-reset="false"
					>
						{region.shortName}
					</a>
				</th>
				<!-- The index shares the average's cell, not a column of its own: it is a reading of that
				     number, and a fourth column made the table too wide for a phone. -->
				<td class="number">
					<span class="forecast">
						{Math.round(region.avgForecast)}
						<IndexBadge index={indexForIntensity(region.avgForecast)} />
					</span>
				</td>
				<td><TierBadge tier={region.tier} /></td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
	}

	caption {
		padding-bottom: var(--space-3);
		color: var(--text-muted);
		font-size: var(--text-sm);
		text-align: left;
	}

	/* Tight padding first, so the table fits a phone without scrolling sideways, and roomier
	   from 40rem wide. Rows are split by quiet hairlines; the header has the stronger rule. */
	th,
	td {
		padding: var(--space-3) var(--space-2);
		border-bottom: var(--border-width) solid var(--hairline);
		text-align: left;
	}

	thead th {
		border-bottom-color: var(--border);
		color: var(--text-muted);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	tbody tr:last-child > * {
		border-bottom: none;
	}

	@media (min-width: 40rem) {
		th,
		td {
			padding-inline: var(--space-3);
		}
	}

	.sort-status {
		margin: 0 0 var(--space-3);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* Region names read as names first, with a quiet underline that still marks them as links. */
	tbody th a {
		color: var(--text);
		font-weight: 500;
		text-decoration-color: var(--border);
	}

	tbody th a:hover {
		text-decoration-color: currentColor;
	}

	/* A button does not inherit the header's text styling, so it is set back to match. The
	   focus outline comes from the global :focus-visible rule. */
	th button {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 0;
		border: none;
		background: none;
		color: inherit;
		font: inherit;
		cursor: pointer;
	}

	/* Underlined as well as recoloured, so the change does not rely on colour alone. */
	th button:hover {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}

	/* The selected row is tinted and has a bar on its left edge, and its link is bold. The bar and
	   the bold text mean the selection does not rely on the tint's colour alone. An inset shadow
	   draws the bar without changing the cell's width. */
	tr.selected {
		background: color-mix(in srgb, var(--accent) 10%, var(--surface));
	}

	tr.selected th {
		box-shadow: inset var(--space-1) 0 var(--accent);
	}

	a[aria-current="true"] {
		color: var(--text);
		font-weight: 700;
	}

	/* The icon that says "this can be sorted" is quieter than the arrow on the active column. */
	.idle-icon {
		color: var(--text-muted);
	}

	/* Numbers line up on the right, and equal-width digits keep the columns tidy. */
	.number {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}

	/* The number above its index badge, both on the right, so the numbers still line up down the
	   column whatever the width of the badge. */
	.forecast {
		display: inline-flex;
		flex-direction: column;
		align-items: flex-end;
		gap: var(--space-1);
		font-weight: 600;
	}
</style>
