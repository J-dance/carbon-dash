<script lang="ts">
	import { page } from "$app/state";
	import type { PageProps } from "./$types";
	import { parseRegionId } from "#lib/regions/selection.ts";
	import RangeFilter from "#lib/components/RangeFilter.svelte";
	import RegionPreview from "#lib/components/RegionPreview.svelte";
	import RegionsTable from "#lib/components/RegionsTable.svelte";
	import TierFilter from "#lib/components/TierFilter.svelte";

	let { data }: PageProps = $props();

	// Timestamps are stored in UTC, but the people reading this are in the UK.
	const dateTime = new Intl.DateTimeFormat("en-GB", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "Europe/London"
	});

	// $derived, not a plain const: it is recalculated when `data` changes (for example after
	// the range changes and `load` runs again), so the label never shows the old period.
	const newestPeriodLabel = $derived(
		data.newestPeriod === null ? null : dateTime.format(new Date(data.newestPeriod))
	);

	// The selected region lives in the URL (?region=13), not in component state, so a shared link,
	// a refresh and the back button all keep it. $derived re-reads it whenever the URL changes.
	const selectedId = $derived(parseRegionId(page.url.searchParams.get("region")));

	// What the panel's status line announces when the selection changes. The name comes from the
	// table data, which is already loaded, so it is announced straight away. A region the tier
	// filter has hidden is not in that data, so it gets a general wording.
	const previewStatus = $derived.by(() => {
		if (selectedId === null) return "";
		const region = data.regions.find((r) => r.regionId === selectedId);
		return region ? `Showing ${region.shortName} in the preview.` : "Showing the selected region in the preview.";
	});
</script>

<svelte:head>
	<title>Regions | Carbon Dash</title>
</svelte:head>

<h1>Regions</h1>

{#if data.newestPeriod === null}
	<p>No data yet.</p>
{:else}
	<!-- Stale data is still data, so this is a note above the table, not a replacement for it. -->
	{#if data.isStale}
		<p role="status">
			Showing data from {newestPeriodLabel}. We could not fetch anything newer just now.
		</p>
	{/if}

	<div class="filters">
		<RangeFilter current={data.range} />
		<TierFilter current={data.tier} />
	</div>

	<!-- Master-detail (README, UI decisions): the table, with the preview panel beside it on a wide
		screen and below it on a narrow one. -->
	<div class="layout">
		<div>
			{#if data.regions.length === 0}
				<p>No regions match these filters. Choose a different period or tier.</p>
			{:else}
				<RegionsTable regions={data.regions} range={data.range} {selectedId} />
			{/if}
		</div>

		<aside class="preview" aria-label="Region preview">
			<!-- Always in the page, so a screen reader hears it change. A live region that is added
				along with its text is often not announced. -->
			<p class="visually-hidden" role="status">{previewStatus}</p>

			<!-- `detail` is null when no region is chosen, and otherwise a promise that `load` streams
				in after the table: {#await} shows a branch for each state of that promise. -->
			{#if data.detail === null}
				<p>Choose a region in the table to see its forecast and fuel mix here.</p>
			{:else}
				{#await data.detail}
					<p>Loading the region…</p>
				{:then detail}
					{#if detail === null}
						<p>That region does not exist. Choose one from the table.</p>
					{:else}
						<RegionPreview {detail} />
					{/if}
				{:catch}
					<!-- role="alert" so a screen reader hears it at once. The error's own text is not shown:
						SvelteKit does not send it to the browser, and the server has logged it. -->
					<p role="alert">
						Could not load this region. Choose another one, or reload the page to try again.
					</p>
				{/await}
			{/if}
		</aside>
	</div>
{/if}

<style>
	.layout {
		display: grid;
		gap: var(--space-6);
		max-width: var(--content-max-width);
	}

	/* Lets the table's column shrink below its content's width instead of pushing the page wider. */
	.layout > * {
		min-width: 0;
	}

	.preview {
		padding: var(--space-4);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
	}

	/* Side by side once there is room for both: about 60% table and 40% panel. The panel is
	   sticky, so it stays in view while you go down the table. 60rem is written out because a
	   media query cannot read a custom property. */
	@media (min-width: 60rem) {
		.layout {
			grid-template-columns: 3fr 2fr;
			align-items: start;
		}

		.preview {
			position: sticky;
			top: var(--space-4);
		}
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-8);
		padding-bottom: var(--space-4);
	}
</style>
