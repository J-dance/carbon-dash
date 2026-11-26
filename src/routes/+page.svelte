<script lang="ts">
	import AccuracySummary from "#lib/components/AccuracySummary.svelte";
	import Card from "#lib/components/Card.svelte";
	import FuelMixCard from "#lib/components/FuelMixCard.svelte";
	import InfoButton from "#lib/components/InfoButton.svelte";
	import IntensityNowCard from "#lib/components/IntensityNowCard.svelte";
	import LineChart from "#lib/components/LineChart.svelte";
	import PageHeader from "#lib/components/PageHeader.svelte";
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

<!-- Passed to PageHeader only when there is a period. The {#if} is still needed inside, because
	TypeScript cannot see that check from in here. -->
{#snippet latestPeriod()}
	{#if period !== null}
		Latest 30-minute period:
		<time datetime={period.start.toISOString()}>{timeFormat.format(period.start)}</time>
		to
		<time datetime={period.end.toISOString()}>{timeFormat.format(period.end)}</time>
		UTC
	{/if}
{/snippet}

<PageHeader
	title="Great Britain Carbon Intensity"
	kicker={period === null ? undefined : latestPeriod}
	{standfirst}
	live
/>

{#if data.latest !== null && period !== null}
	{#if data.isStale}
		<!-- The date is shown here because stale data can be days old. -->
		<p class="stale">
			These figures are from {dateTimeFormat.format(period.start)} UTC and could not be
			updated just now. Reload in a few minutes to try again.
		</p>
	{/if}

	<!-- In the order they sit on a desktop, left to right, so the reading order matches. -->
	<div class="widgets">
		<!-- --enter: each widget's place in the staggered entrance (layout.css). -->
		<div class="now" style:--enter="0">
			<IntensityNowCard intensity={data.latest.now} average30d={data.latest.average30d} />
		</div>
		<div class="fuel" style:--enter="1">
			<FuelMixCard mix={data.latest.mix} />
		</div>
		<div class="accuracy" style:--enter="2">
			<Card>
				<h2>Forecast accuracy, last 24 hours</h2>
				<InfoButton title="Forecast accuracy">
					<p>
						How close the forecasts were to what actually happened, over the last 24 hours.
					</p>
					<p>
						Average error is how far off a forecast usually was. Bias says whether forecasts tended
						to come out too high or too low. The last figure is how often a forecast was within 10%
						of the real value.
					</p>
					<!-- How much data the figures rest on. Kept here rather than in the widget, so the widget
						stays short. -->
					{#if data.history.accuracy}
						<p>
							Based on the {data.history.accuracy.count} half-hour periods that have an actual
							value.
						</p>
					{/if}
				</InfoButton>
				<AccuracySummary accuracy={data.history.accuracy} />
			</Card>
		</div>
		<div class="chart" style:--enter="3">
			<Card>
				<h2>Last 24 hours: actual vs forecast</h2>
				<InfoButton title="Actual vs forecast">
					<p>
						Carbon intensity for each half hour of the last 24 hours. The solid line is what
						actually happened and the dashed line is what was forecast, so you can see how far apart
						they were.
					</p>
					<p>Move the slider under the chart, or touch the chart, to read any half hour.</p>
				</InfoButton>
				<LineChart periods={data.history.periods} subject="national carbon intensity" />
			</Card>
		</div>
	</div>
{:else}
	<p>No data is available yet. Reload in a few minutes to try again.</p>
{/if}

<style>
	.stale {
		margin-bottom: var(--space-4);
		font-size: var(--text-sm);
	}

	/*
	 * The bento grid, built to fit as much as it can on one screen. Named areas place each widget,
	 * so the layout can change at each width without changing the markup.
	 * - Mobile first: one column, so the widgets stack in source order.
	 * - From 48rem: "now" and the fuel mix share a row, accuracy and the chart each take a row.
	 * - From 72rem: now, the fuel mix and accuracy share the top row (fuel mix in the middle, a
	 *   little wider for its legend), and the chart spans the row under them.
	 * minmax(0, …) lets a column shrink below its content. Widgets in a row stretch to the same
	 * height, so the row edges line up.
	 */
	.widgets {
		display: grid;
		grid-template-columns: minmax(0, 1fr);
		gap: var(--space-4);
	}

	/* The areas are only named from 48rem. A grid-area that names an area the grid does not
	   define stacks every widget in the same spot, so on a phone they keep their source order. */
	@media (min-width: 48rem) {
		.widgets {
			grid-template-columns: minmax(0, 2fr) minmax(0, 3fr);
			grid-template-areas:
				"now fuel"
				"accuracy accuracy"
				"chart chart";
		}

		.now {
			grid-area: now;
		}

		.accuracy {
			grid-area: accuracy;
		}

		.fuel {
			grid-area: fuel;
		}

		.chart {
			grid-area: chart;
		}
	}

	@media (min-width: 72rem) {
		.widgets {
			grid-template-columns: minmax(0, 1fr) minmax(0, 1.3fr) minmax(0, 1fr);
			grid-template-areas:
				"now fuel accuracy"
				"chart chart chart";
		}
	}

	/* Each wrapper is a grid too, so the Card inside it fills the full row height. */
	.now,
	.accuracy,
	.fuel,
	.chart {
		display: grid;
	}
</style>
