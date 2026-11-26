<script lang="ts">
	import Card from "#lib/components/Card.svelte";
	import InfoButton from "#lib/components/InfoButton.svelte";
	import type { RegionGap } from "#lib/regions/stats.ts";
	import { RANGE_PHRASES, type Range } from "#lib/regions/types.ts";

	/** The cleanest and dirtiest region over the range, to show how much location matters. */
	let { gap, range }: { gap: RegionGap; range: Range } = $props();
</script>

<Card>
	<h2>Cleanest vs dirtiest region</h2>
	<InfoButton title="Cleanest vs dirtiest region">
		<p>
			The regions with the lowest and highest average forecast carbon intensity over the chosen
			period, and the difference between them.
		</p>
		<p>It shows how much where you live in Great Britain changes how clean your electricity is.</p>
	</InfoButton>
	<dl>
		<div class="cleanest">
			<dt>Cleanest</dt>
			<dd>
				<span class="value">{Math.round(gap.cleanest.avgForecast)}</span>
				{gap.cleanest.shortName}
			</dd>
		</div>
		<div class="dirtiest">
			<dt>Dirtiest</dt>
			<dd>
				<span class="value">{Math.round(gap.dirtiest.avgForecast)}</span>
				{gap.dirtiest.shortName}
			</dd>
		</div>
		<div>
			<dt>Gap</dt>
			<dd><span class="value">{Math.round(gap.difference)}</span> between them</dd>
		</div>
	</dl>
	<p class="unit">Average forecasts in gCO₂/kWh over {RANGE_PHRASES[range]}, across all 14 regions.</p>
</Card>

<style>
	/* Three tiles in a row where they fit, each at least 7rem so a region name never breaks
	   mid-word. On a small phone the gap tile wraps to a second row. */
	dl {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 7rem), 1fr));
		gap: var(--space-2);
	}

	/* Stat tiles on the sunken surface, like the other widgets' tiles. */
	dl div {
		padding: var(--space-2) var(--space-3);
		border-radius: var(--radius-md);
		background: var(--surface-sunken);
	}

	/* Cleanest in the green of a very low index and dirtiest in the red of a very high one: a tint
	   and a bar down the left edge. The labels say which is which, so the colour only repeats them.
   `dl` in the selector so it outranks the `dl div` rule above. */
	dl .cleanest,
	dl .dirtiest {
		background: color-mix(in srgb, var(--tile-color) 14%, var(--surface));
		box-shadow: inset 3px 0 var(--tile-color);
	}

	.cleanest {
		--tile-color: var(--index-very-low);
	}

	.dirtiest {
		--tile-color: var(--index-very-high);
	}

	dt {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* break-word only splits a word that is too long for the tile on its own, so it is a safety net
	   rather than something that happens at normal widths. */
	dd {
		font-size: var(--text-sm);
		overflow-wrap: break-word;
	}

	.value {
		display: block;
		font-size: var(--text-lg);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1.3;
	}

	.unit {
		margin-top: var(--space-3);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
</style>
