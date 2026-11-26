<script lang="ts">
	import { page } from "$app/state";
	import type { PageProps } from "./$types";
	import Card from "#lib/components/Card.svelte";
	import ForecastTiles from "#lib/components/ForecastTiles.svelte";
	import InfoButton from "#lib/components/InfoButton.svelte";
	import FuelMixBar from "#lib/components/FuelMixBar.svelte";
	import LineChart from "#lib/components/LineChart.svelte";
	import PageHeader from "#lib/components/PageHeader.svelte";
	import RangeFilter from "#lib/components/RangeFilter.svelte";
	import TierBadge from "#lib/components/TierBadge.svelte";
	import { forecastExtremes } from "#lib/regions/stats.ts";
	import { RANGE_PHRASES } from "#lib/regions/types.ts";

	let { data }: PageProps = $props();

	// All $derived, not plain consts: changing the range keeps this component and only gives it
	// new `data`, so anything worked out from `data` has to follow it.

	// The region's name for the title and heading. `tier` is null when the database is empty, so
	// there is no name to show then.
	const title = $derived(data.tier?.shortName ?? "Region");

	// Named so the template can narrow them: once `{#if}` has ruled out null, TypeScript knows.
	const ranked = $derived(data.tier);
	const latest = $derived(data.latest);
	const extremes = $derived(forecastExtremes(data.series));
	const rangePhrase = $derived(RANGE_PHRASES[data.range]);

	// Back to the table with this region still selected and the same period. `page.params.id` is
	// the [id] from the URL. `load` has already had it checked (an unknown id never gets here).
	const backHref = $derived(`/regions?region=${page.params.id}&range=${data.range}`);
</script>

<svelte:head>
	<title>{title} | Carbon Dash</title>
</svelte:head>

<p class="back"><a href={backHref}><span aria-hidden="true">←</span> Back to the regions table</a></p>

{#snippet regionKicker()}
	Regional forecast
{/snippet}

<PageHeader {title} kicker={regionKicker} />

{#if ranked === null || latest === null || extremes === null}
	<p>No data is stored for this region yet. Reload in a few minutes to try again.</p>
{:else}
	<p class="summary">
		<TierBadge tier={ranked.tier} />
		Average {Math.round(ranked.avgForecast)} gCO₂/kWh over {rangePhrase}
	</p>

	<!-- Stale data is still data, so this is a note, not a replacement for the page. -->
	{#if data.isStale}
		<p class="stale" role="status">These figures could not be updated just now. Reload in a few minutes to try again.</p>
	{/if}

	<div class="filters">
		<RangeFilter current={data.range} />
	</div>

	<div class="overview">
		<!-- Big numbers for a quick read, and the text summary of the chart below. -->
		<Card enter={0}>
			<h2>Forecast at a glance</h2>
			<InfoButton title="Forecast at a glance">
				<p>
					The newest forecast for {title}, and the lowest and highest forecast over the chosen
					period, in grams of CO₂ per kilowatt-hour. Lower is cleaner.
				</p>
				<p>Regions only have forecasts. Measured values are only published for Great Britain as a whole.</p>
			</InfoButton>
			<ForecastTiles {latest} {extremes} range={data.range} />
		</Card>

		<Card enter={1}>
			<h2>Fuel mix now</h2>
			<InfoButton title="Fuel mix now">
				<p>
					Where {title}'s electricity is coming from right now. Renewables (wind, solar, hydro and
					biomass) and nuclear release little or no CO₂, while fossil fuels (gas and coal) release
					the most.
				</p>
			</InfoButton>
			<FuelMixBar mix={latest.mix} />
		</Card>
	</div>

	<section class="chart">
		<Card enter={2}>
			<h2>Forecast over {rangePhrase}</h2>
			<InfoButton title="Forecast over {rangePhrase}">
				<p>
					The forecast carbon intensity for {title} for each half hour over the chosen period. Lower
					is cleaner, so the dips are the best times to use electricity.
				</p>
				<p>Move the slider under the chart, or touch the chart, to read any half hour.</p>
			</InfoButton>
			<!-- A boundary catches an error thrown while the chart renders, and shows `failed` in its
				place, so a chart bug does not take the rest of the page with it. It does not catch errors
				from `load`: those happen before the page renders, and go to +error.svelte. -->
			<svelte:boundary>
				<LineChart periods={data.series} subject="carbon intensity in {ranked.shortName}" />

				{#snippet failed(_error, reset)}
					<p role="alert">
						Could not draw the chart. The latest, lowest and highest forecasts are above.
						<button type="button" onclick={reset}>Try again</button>
					</p>
				{/snippet}
			</svelte:boundary>
		</Card>
	</section>
{/if}

<style>
	.back {
		margin-bottom: var(--space-2);
		font-size: var(--text-sm);
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.stale {
		margin-top: var(--space-2);
		font-size: var(--text-sm);
	}

	.filters {
		padding-block: var(--space-4);
	}

	/* Mobile first: tiles above the fuel mix. Side by side once there is room, the same 60rem
	   breakpoint as the regions page (a media query cannot read a custom property). The two
	   widgets stretch to the same height, so the row edges line up. */
	.overview {
		display: grid;
		gap: var(--space-4);
	}

	@media (min-width: 60rem) {
		.overview {
			grid-template-columns: minmax(0, 3fr) minmax(0, 2fr);
		}
	}

	.chart {
		margin-top: var(--space-4);
	}
</style>
