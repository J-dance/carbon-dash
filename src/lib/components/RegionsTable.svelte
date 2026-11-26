<script lang="ts">
	import { page } from "$app/state";
	import type { Range, RegionTier } from "#lib/regions/types.ts";
	import { withParam } from "#lib/url.ts";
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

	const RANGE_LABELS: Record<Range, string> = {
		"24h": "the last 24 hours",
		"7d": "the last 7 days",
		"30d": "the last 30 days",
	};

	const COLUMN_LABELS: Record<SortKey, string> = {
		name: "Region",
		forecast: "Average forecast (gCO2/kWh)",
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
		Carbon intensity by region, ranked over {RANGE_LABELS[range]}. Top is the
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
				<td class="number">{Math.round(region.avgForecast)}</td>
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
		padding-bottom: var(--space-2);
		color: var(--text-muted);
		text-align: left;
	}

	th,
	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: var(--border-width) solid var(--border);
		text-align: left;
	}

	.sort-status {
		margin: 0 0 var(--space-2);
		color: var(--text-muted);
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
		background: color-mix(in srgb, var(--accent) 12%, var(--surface));
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
</style>
