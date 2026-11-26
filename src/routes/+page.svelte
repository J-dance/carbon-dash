<script lang="ts">
	import AccuracySummary from "#lib/components/AccuracySummary.svelte";
	import Card from "#lib/components/Card.svelte";
	import FuelMixCard from "#lib/components/FuelMixCard.svelte";
	import IntensityNowCard from "#lib/components/IntensityNowCard.svelte";
	import LineChart from "#lib/components/LineChart.svelte";
	import type { PageProps } from "./$types";

	let { data }: PageProps = $props();

	// A period is 30 minutes long, so only its start is stored.
	const PERIOD_MS = 30 * 60 * 1000;

	// Fixed locale and time zone, so the server and the browser print the same text.
	const timeFormat = new Intl.DateTimeFormat("en-GB", {
		timeStyle: "short",
		timeZone: "UTC"
	});
	const dateTimeFormat = new Intl.DateTimeFormat("en-GB", {
		dateStyle: "medium",
		timeStyle: "short",
		timeZone: "UTC"
	});

	// $derived: `latest` is null when there is no data, so the period is too.
	const period = $derived.by(() => {
		if (data.latest === null) return null;
		const start = new Date(data.latest.period);
		return { start, end: new Date(start.getTime() + PERIOD_MS) };
	});
</script>

<svelte:head>
	<title>Home | Carbon Dash</title>
</svelte:head>

<h1>Great Britain Carbon Intensity</h1>

{#if data.latest !== null && period !== null}
	<p class="period">
		Latest 30-minute period:
		<time datetime={period.start.toISOString()}>{timeFormat.format(period.start)}</time>
		to
		<time datetime={period.end.toISOString()}>{timeFormat.format(period.end)}</time>
		UTC
	</p>

	{#if data.isStale}
		<!-- The date is shown here because stale data can be days old. -->
		<p class="stale">
			These figures are from {dateTimeFormat.format(period.start)} UTC and could not be
			updated just now. Reload in a few minutes to try again.
		</p>
	{/if}

	<div class="cards">
		<IntensityNowCard intensity={data.latest.now} average30d={data.latest.average30d} />
		<FuelMixCard mix={data.latest.mix} />
	</div>

	<section class="history">
		<Card>
			<h2>Last 24 hours: actual vs forecast</h2>
			<AccuracySummary accuracy={data.history.accuracy} />
			<LineChart periods={data.history.periods} subject="national carbon intensity" />
		</Card>
	</section>
{:else}
	<p>No data is available yet. Reload in a few minutes to try again.</p>
{/if}

<style>
	h1 {
		margin-bottom: var(--space-2);
	}

	.period {
		margin-bottom: var(--space-4);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* Below the period line, so only the bottom margin of the pair needs setting. */
	.period:has(+ .stale) {
		margin-bottom: var(--space-1);
	}

	.stale {
		margin-bottom: var(--space-4);
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

	.history {
		max-width: var(--content-max-width);
		margin-top: var(--space-4);
	}
</style>
