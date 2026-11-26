<script lang="ts">
	import { page } from "$app/state";
	import type { PageProps } from "./$types";
	import { parseRegionId } from "#lib/regions/selection.ts";
	import { RANGE_PHRASES } from "#lib/regions/types.ts";
	import Card from "#lib/components/Card.svelte";
	import InfoButton from "#lib/components/InfoButton.svelte";
	import PageHeader from "#lib/components/PageHeader.svelte";
	import RangeFilter from "#lib/components/RangeFilter.svelte";
	import RegionGapTile from "#lib/components/RegionGapTile.svelte";
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

{#snippet rangeKicker()}
	Ranked over {RANGE_PHRASES[data.range]}
{/snippet}

<PageHeader
	title="Regions"
	kicker={rangeKicker}
	standfirst="Average forecast carbon intensity for each region of Great Britain. Choose a region to see its forecast and fuel mix."
/>

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

	<!-- Master-detail (README, UI decisions): the table, with the gap widget and the preview panel
		beside it on a wide screen, and all three stacked on a narrow one (gap first, as a summary). -->
	<div class="layout">
		{#if data.gap !== null}
			<!-- --enter: each widget's place in the staggered entrance (layout.css), table first. -->
			<div class="gap" style:--enter="1">
				<RegionGapTile gap={data.gap} range={data.range} />
			</div>
		{/if}

		<div class="table" style:--enter="0">
			<Card>
				<InfoButton title="Regions by average forecast">
					<p>
						Every region of Great Britain, ranked by its average forecast carbon intensity over the
						chosen period. Lower is cleaner.
					</p>
					<p>
						Tiers split the regions into thirds: Top is the cleanest third and Bottom the dirtiest.
						Choose a region's name to see its forecast and fuel mix.
					</p>
				</InfoButton>
				{#if data.regions.length === 0}
					<p>No regions match these filters. Choose a different period or tier.</p>
				{:else}
					<RegionsTable regions={data.regions} range={data.range} {selectedId} />
				{/if}
			</Card>
		</div>

		<aside class="preview rise" style:--enter="2" aria-label="Region preview">
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
		gap: var(--space-4);
	}

	/* Lets the table's column shrink below its content's width instead of pushing the page wider. */
	.layout > * {
		min-width: 0;
	}

	/* The same surface as a Card widget. It is not a Card because it is an <aside>, not an
	   <article>, and it has no h2 title of its own until a region is chosen. */
	.preview {
		padding: clamp(var(--space-4), 2.5vw, var(--space-6));
		border: var(--border-width) solid var(--hairline);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-widget);
	}

	/* Side by side once there is room: the table on the left (about 60%), and on the right the gap
	   widget with the preview panel under it. The table spans both rows. Only the panel is sticky,
	   so it stays in view below the masthead while you go down the table; the gap widget scrolls
	   away. 60rem is written out because a media query cannot read a custom property. */
	@media (min-width: 60rem) {
		.layout {
			grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
			grid-template-areas:
				"table gap"
				"table preview";
			grid-template-rows: auto 1fr;
			align-items: start;
		}

		.gap {
			grid-area: gap;
		}

		.table {
			grid-area: table;
		}

		.preview {
			grid-area: preview;
			position: sticky;
			top: calc(var(--masthead-height) + var(--space-4));
		}
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-3) var(--space-8);
		margin-bottom: var(--space-6);
	}
</style>
