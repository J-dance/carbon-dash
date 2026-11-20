<script lang="ts">
	import type { PageProps } from "./$types";
	import RegionsTable from "#lib/components/RegionsTable.svelte";

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

	<RegionsTable regions={data.regions} range={data.range} />
{/if}
