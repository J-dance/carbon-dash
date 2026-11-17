<script lang="ts">
	import FuelMixCard from "#lib/components/FuelMixCard.svelte";
	import IntensityNowCard from "#lib/components/IntensityNowCard.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	// Fixed locale and time zone, so the server and the browser print the same text.
	const timeFormat = new Intl.DateTimeFormat("en-GB", {
		timeStyle: "short",
		timeZone: "UTC"
	});

	function formatTime(iso: string): string {
		return timeFormat.format(new Date(iso));
	}
</script>

<svelte:head>
	<title>Home | Carbon Dash</title>
</svelte:head>

<h1>Great Britain Carbon Intensity</h1>

<p class="period">
	Latest 30-minute period:
	<time datetime={data.intensity.from}>{formatTime(data.intensity.from)}</time>
	to
	<time datetime={data.intensity.to}>{formatTime(data.intensity.to)}</time>
	UTC
</p>

<div class="cards">
	<IntensityNowCard intensity={data.intensity} />
	<FuelMixCard mix={data.generation.mix} />
</div>

<style>
	h1 {
		margin-bottom: var(--space-2);
	}

	.period {
		margin-bottom: var(--space-4);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/*
	 * Mobile first, with no media query: as many columns as fit, each at least 18rem.
	 * min(100%, 18rem) lets a column shrink below 18rem on very narrow screens
	 * instead of overflowing.
	 */
	.cards {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 18rem), 1fr));
		gap: var(--space-4);
		max-width: var(--content-max-width);
	}
</style>
