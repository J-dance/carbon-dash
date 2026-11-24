<script lang="ts">
	import type { PageProps } from "./$types";
	import RangeFilter from "#lib/components/RangeFilter.svelte";
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

	{#if data.regions.length === 0}
		<p>No regions match these filters. Choose a different period or tier.</p>
	{:else}
		<RegionsTable regions={data.regions} range={data.range} />
	{/if}
{/if}

<style>
	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-8);
		padding-bottom: var(--space-4);
	}
</style>
