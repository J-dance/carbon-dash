<script lang="ts">
	import FuelMixBar from "#lib/components/FuelMixBar.svelte";
	import Sparkline from "#lib/components/Sparkline.svelte";
	import TierBadge from "#lib/components/TierBadge.svelte";
	import { forecastExtremes } from "#lib/regions/stats.ts";
	import { RANGE_PHRASES } from "#lib/regions/types.ts";
	// A type-only import is removed when compiled, so this does not pull server code into the browser.
	import type { RegionDetailResponse } from "#lib/server/regions/response.ts";

	/**
	 * The contents of the regions page's preview panel for one region, once its data has loaded:
	 * its tier, its latest, lowest and highest forecast, a sparkline over the range and its fuel mix.
	 */
	let { detail }: { detail: RegionDetailResponse } = $props();

	// Named so the template can narrow them: once `{#if}` has ruled out null, TypeScript knows.
	const ranked = $derived(detail.tier);
	const latest = $derived(detail.latest);
	const extremes = $derived(forecastExtremes(detail.series));
	const rangePhrase = $derived(RANGE_PHRASES[detail.range]);
</script>

{#if ranked === null || latest === null || extremes === null}
	<p>No data is stored for this region yet. Reload in a few minutes to try again.</p>
{:else}
	<h2>{ranked.shortName}</h2>
	<p class="summary">
		<TierBadge tier={ranked.tier} />
		Average {Math.round(ranked.avgForecast)} gCO₂/kWh over {rangePhrase}
	</p>

	<!-- Big numbers for a quick read. They are also the text alternative for the sparkline. -->
	<dl class="tiles">
		<div>
			<dt>Latest</dt>
			<dd><span class="value">{latest.forecast}</span> {latest.index}</dd>
		</div>
		<div>
			<dt>Lowest</dt>
			<dd><span class="value">{extremes.low}</span></dd>
		</div>
		<div>
			<dt>Highest</dt>
			<dd><span class="value">{extremes.high}</span></dd>
		</div>
	</dl>
	<p class="unit">Forecasts in gCO₂/kWh. Latest is the newest period, lowest and highest are over {rangePhrase}.</p>

	<section>
		<h3>Forecast over {rangePhrase}</h3>
		<Sparkline
			periods={detail.series}
			label="Forecast for {ranked.shortName} over {rangePhrase}, from {extremes.low} to {extremes.high} gCO2/kWh, ending at {latest.forecast}."
		/>
	</section>

	<section>
		<h3>Fuel mix now</h3>
		<FuelMixBar mix={latest.mix} />
	</section>
{/if}

<style>
	h2 {
		font-size: var(--text-lg);
	}

	.summary {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* Three equal tiles. min-width: 0 lets them shrink on a narrow panel instead of overflowing. */
	.tiles {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-2);
		margin-top: var(--space-4);
	}

	.tiles div {
		padding: var(--space-2);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-sm);
	}

	dt {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	dd {
		font-size: var(--text-sm);
	}

	.value {
		display: block;
		font-size: var(--text-xl);
		font-weight: 700;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}

	.unit {
		margin-top: var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	section {
		margin-top: var(--space-4);
	}

	h3 {
		margin-bottom: var(--space-2);
		font-size: var(--text-base);
	}
</style>
