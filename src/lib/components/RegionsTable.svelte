<script lang="ts">
	import { TIER_LABELS, type Range, type RegionTier } from "#lib/regions/types.ts";

	let { regions, range }: { regions: RegionTier[]; range: Range } = $props();

	const RANGE_LABELS: Record<Range, string> = {
		"24h": "the last 24 hours",
		"7d": "the last 7 days",
		"30d": "the last 30 days"
	};

	// Tiers are shown as words here. The icon and colour come later, with the tier badge.
</script>

<table>
	<caption>
		Carbon intensity by region, ranked over {RANGE_LABELS[range]}. Top is the cleanest third.
	</caption>
	<thead>
		<tr>
			<th scope="col">Region</th>
			<th scope="col" class="number">Average forecast (gCO2/kWh)</th>
			<th scope="col">Tier</th>
		</tr>
	</thead>
	<tbody>
		<!-- The key lets Svelte match each row to its region when the data changes. -->
		{#each regions as region (region.regionId)}
			<tr>
				<th scope="row">{region.shortName}</th>
				<td class="number">{Math.round(region.avgForecast)}</td>
				<td>{TIER_LABELS[region.tier]}</td>
			</tr>
		{/each}
	</tbody>
</table>

<style>
	table {
		width: 100%;
		border-collapse: collapse;
	}

	caption {
		padding-bottom: var(--space-2);
		color: var(--text-muted);
		text-align: left;
	}

	th,
	td {
		padding: var(--space-2) var(--space-3);
		border-bottom: var(--border-width) solid var(--border);
		text-align: left;
	}

	/* Numbers line up on the right, and equal-width digits keep the columns tidy. */
	.number {
		text-align: right;
		font-variant-numeric: tabular-nums;
	}
</style>
