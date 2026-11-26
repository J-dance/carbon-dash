<script lang="ts">
	import Card from "#lib/components/Card.svelte";
	import IndexBadge from "#lib/components/IndexBadge.svelte";
	import InfoButton from "#lib/components/InfoButton.svelte";
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
	<!-- The band sits beside the title, so it reads as a label for the whole card. It wraps under the
		title in a narrow card. -->
	<div class="title-row">
		<h2>Carbon intensity now</h2>
		<IndexBadge index={intensity.index} />
	</div>
	<InfoButton title="Carbon intensity now">
		<p>
			How much CO₂ is released for each unit of electricity used in Great Britain right now, in grams
			per kilowatt-hour (gCO₂/kWh). Lower is cleaner.
		</p>
		<p>
			The band, from very low to very high, and the comparison with the last 30 days show whether
			now is a good time to use electricity.
		</p>
	</InfoButton>

	<p class="value">{value} <small>gCO₂/kWh</small></p>

	{#if isForecast}
		<p class="note">Forecast: the actual value is not available yet</p>
	{/if}

	{#if comparison !== null && average30d !== null}
		<p class="delta" data-direction={comparison.direction}>
			<span class="arrow" aria-hidden="true">{ARROWS[comparison.direction]}</span>
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

	/* The title and badge on one line. The row takes over the h2's spacing from Card: the gap below,
	   and room on the right for the InfoButton in the corner. */
	.title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
		margin-bottom: var(--space-4);
		padding-right: var(--space-8);
	}

	.title-row h2 {
		margin-bottom: 0;
		padding-right: 0;
	}

	.note {
		margin-top: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* A chip, so the comparison reads as a small fact under the number. Cleaner than average is
	   tinted green and dirtier orange, with the arrow in that colour; the same is neutral. The words
	   and the arrow's direction say it too, so the colour is never the only signal. */
	.delta {
		--delta-color: var(--text-muted);
		display: inline-flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-md);
		background: var(--surface-sunken);
		font-size: var(--text-sm);
	}

	.delta[data-direction="below"] {
		--delta-color: var(--index-very-low);
	}

	.delta[data-direction="above"] {
		--delta-color: var(--index-high);
	}

	.delta:not([data-direction="same"]) {
		background: color-mix(in srgb, var(--delta-color) 16%, var(--surface));
	}

	.arrow {
		color: var(--delta-color);
	}
</style>
