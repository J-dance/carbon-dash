<script lang="ts">
	import { page } from "$app/state";
	import type { PageProps } from "./$types";
	import Card from "#lib/components/Card.svelte";
	import ForecastTiles from "#lib/components/ForecastTiles.svelte";
	import FuelMixBar from "#lib/components/FuelMixBar.svelte";
	import LineChart from "#lib/components/LineChart.svelte";
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

<h1>{title}</h1>

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
		<!-- Big numbers for a quick read, and the text summary of the chart below. Wrapped, because the
			tiles and their note are two elements, and each would otherwise take a grid cell. -->
		<div>
			<ForecastTiles {latest} {extremes} range={data.range} />
		</div>

		<Card>
			<h2>Fuel mix now</h2>
			<FuelMixBar mix={latest.mix} />
		</Card>
	</div>

	<section class="chart">
		<Card>
			<h2>Forecast over {rangePhrase}</h2>
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

	h1 {
		margin-bottom: var(--space-2);
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
	   breakpoint as the regions page (a media query cannot read a custom property). */
	.overview {
		display: grid;
		gap: var(--space-4);
		max-width: var(--content-max-width);
	}

	@media (min-width: 60rem) {
		.overview {
			grid-template-columns: 3fr 2fr;
			align-items: start;
		}
	}

	.chart {
		max-width: var(--content-max-width);
		margin-top: var(--space-4);
	}
</style>
