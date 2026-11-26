<script lang="ts">
	import Card from "#lib/components/Card.svelte";
	import IndexBadge from "#lib/components/IndexBadge.svelte";
	import { compareToAverage } from "#lib/metrics/compare.ts";
	import type { NationalNow } from "#lib/national/types.ts";

	let {
		intensity,
		average30d
	}: {
		intensity: NationalNow;
		/** Average actual intensity over the last 30 days. Null when there is none yet. */
		average30d: number | null;
	} = $props();

	// `actual` is null until the period has ended, so fall back to the forecast and say so.
	const isForecast = $derived(intensity.actual === null);
	const value = $derived(intensity.actual ?? intensity.forecast);

	const comparison = $derived(compareToAverage(value, average30d));

	// The arrow repeats the words, so it is hidden from screen readers.
	const ARROWS = { below: "▼", above: "▲", same: "=" } as const;
</script>

<Card>
	<h2>Carbon intensity now</h2>

	<p class="value">{value} <small>gCO₂/kWh</small></p>

	{#if isForecast}
		<p class="note">Forecast: the actual value is not available yet</p>
	{/if}

	<p class="index-row"><IndexBadge index={intensity.index} /></p>

	{#if comparison !== null && average30d !== null}
		<p class="delta">
			<span aria-hidden="true">{ARROWS[comparison.direction]}</span>
			{#if comparison.direction === "same"}
				About the same as
			{:else}
				{comparison.percent}% {comparison.direction}
			{/if}
			the 30-day average ({Math.round(average30d)} gCO₂/kWh)
		</p>
	{/if}
</Card>

<style>
	/* The big number is the point of the widget: tight letter-spacing at this size, and equal-width
	   digits so it does not shift sideways when the value changes. */
	.value {
		font-size: var(--text-display);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		line-height: 1;
		letter-spacing: -0.03em;
	}

	.value small {
		margin-left: var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-base);
		font-weight: 400;
		letter-spacing: normal;
	}

	.note {
		margin-top: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.index-row {
		margin-top: var(--space-4);
	}

	/* A chip on the sunken surface, so the comparison reads as a small fact under the number. */
	.delta {
		display: inline-flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-md);
		background: var(--surface-sunken);
		font-size: var(--text-sm);
	}
</style>
