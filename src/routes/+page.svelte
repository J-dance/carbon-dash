<script lang="ts">
	import AccuracySummary from "#lib/components/AccuracySummary.svelte";
	import Card from "#lib/components/Card.svelte";
	import FuelMixCard from "#lib/components/FuelMixCard.svelte";
	import IntensityNowCard from "#lib/components/IntensityNowCard.svelte";
	import LineChart from "#lib/components/LineChart.svelte";
	import { compareToAverage } from "#lib/metrics/compare.ts";
	import { gridStandfirst } from "#lib/national/standfirst.ts";
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

	// The summary line under the headline, from the same comparison the "now" card shows. Like the
	// card, it compares the forecast when the actual value is not in yet.
	const standfirst = $derived.by(() => {
		if (data.latest === null) return null;
		const { actual, forecast } = data.latest.now;
		const comparison = compareToAverage(actual ?? forecast, data.latest.average30d);
		return gridStandfirst(comparison, actual === null);
	});
</script>

<svelte:head>
	<title>Home | Carbon Dash</title>
</svelte:head>

<!-- Opens like a news article: a kicker (the small line above), the headline, then a standfirst
	that says what the numbers mean. -->
<header class="lede">
	{#if period !== null}
		<p class="kicker">
			<span class="dot" aria-hidden="true"></span>
			Latest 30-minute period:
			<time datetime={period.start.toISOString()}>{timeFormat.format(period.start)}</time>
			to
			<time datetime={period.end.toISOString()}>{timeFormat.format(period.end)}</time>
			UTC
		</p>
	{/if}
	<h1>Great Britain Carbon Intensity</h1>
	{#if standfirst !== null}
		<p class="standfirst">{standfirst}</p>
	{/if}
</header>

{#if data.latest !== null && period !== null}
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
	.lede {
		display: grid;
		gap: var(--space-3);
		margin: var(--space-6) 0 var(--space-8);
	}

	.kicker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	/* A small marker before the kicker, as news sites use for a live story. It repeats nothing the
	   words do not say, so it is hidden from screen readers. */
	.dot {
		width: 0.5rem;
		height: 0.5rem;
		margin-right: var(--space-1);
		border-radius: var(--radius-pill);
		background: var(--accent);
	}

	/* max-width in ch keeps the line a comfortable reading length on a wide screen. */
	.standfirst {
		max-width: 40ch;
		font-family: var(--font-serif);
		font-size: var(--text-standfirst);
		line-height: 1.35;
		text-wrap: pretty;
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
