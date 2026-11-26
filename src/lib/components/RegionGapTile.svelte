<script lang="ts">
	import type { RegionGap } from "#lib/regions/stats.ts";
	import { RANGE_PHRASES, type Range } from "#lib/regions/types.ts";

	/** The cleanest and dirtiest region over the range, to show how much location matters. */
	let { gap, range }: { gap: RegionGap; range: Range } = $props();
</script>

<section class="gap" aria-labelledby="gap-heading">
	<h2 id="gap-heading">Cleanest vs dirtiest region</h2>
	<dl>
		<div>
			<dt>Cleanest</dt>
			<dd>
				<span class="value">{Math.round(gap.cleanest.avgForecast)}</span>
				{gap.cleanest.shortName}
			</dd>
		</div>
		<div>
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
</section>

<style>
	.gap {
		max-width: var(--content-max-width);
		margin-bottom: var(--space-6);
		padding: var(--space-4);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-md);
		background: var(--surface);
	}

	h2 {
		margin-bottom: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	/* Three equal tiles. min-width: 0 lets them shrink on a narrow screen instead of overflowing. */
	dl {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: var(--space-2);
	}

	dl div {
		padding: var(--space-2);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-sm);
	}

	dt {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* overflow-wrap so a long region name breaks rather than widening its tile. */
	dd {
		font-size: var(--text-sm);
		overflow-wrap: anywhere;
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
</style>
