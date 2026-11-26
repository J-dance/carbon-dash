<script lang="ts">
	import type { Index } from "#lib/api/types.ts";
	import type { ForecastExtremes } from "#lib/regions/stats.ts";
	import { RANGE_PHRASES, type Range } from "#lib/regions/types.ts";

	/**
	 * Three big numbers for a region: its latest forecast (with the index word), and its lowest and
	 * highest forecast over the range. Used by the preview panel and the region detail page. They
	 * are also the text alternative for the line beside them.
	 */
	let {
		latest,
		extremes,
		range
	}: {
		latest: { forecast: number; index: Index };
		extremes: ForecastExtremes;
		range: Range;
	} = $props();

	const rangePhrase = $derived(RANGE_PHRASES[range]);
</script>

<dl class="tiles">
	<!-- data-index picks the index colour (layout.css), which tints this tile. The index word
		is in the tile too, so the colour only repeats it. -->
	<div class="latest" data-index={latest.index}>
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

<style>
	/* Three equal tiles. min-width: 0 lets them shrink on a narrow panel instead of overflowing. */
	.tiles {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-2);
	}

	/* Stat tiles on the sunken surface, like the accuracy summary on the dashboard. */
	.tiles div {
		padding: var(--space-3);
		border-radius: var(--radius-md);
		background: var(--surface-sunken);
	}

	.tiles .latest {
		background: color-mix(in srgb, var(--index-color) 14%, var(--surface));
		box-shadow: inset 3px 0 var(--index-color);
	}

	dt {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* overflow-wrap so "very high" breaks rather than widening its tile in a narrow panel. */
	dd {
		font-size: var(--text-sm);
		overflow-wrap: anywhere;
	}

	.value {
		display: block;
		font-size: var(--text-xl);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1.2;
	}

	.unit {
		margin-top: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
</style>
