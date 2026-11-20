<script lang="ts">
	import { INDEXES } from "#lib/api/types.ts";
	import Card from "#lib/components/Card.svelte";
	import type { NationalNow } from "#lib/national/types.ts";

	let { intensity }: { intensity: NationalNow } = $props();

	// `actual` is null until the period has ended, so fall back to the forecast and say so.
	const isForecast = $derived(intensity.actual === null);
	const value = $derived(intensity.actual ?? intensity.forecast);

	// 1 (very low) to 5 (very high): how many steps of the meter are filled.
	const indexLevel = $derived(INDEXES.indexOf(intensity.index) + 1);
</script>

<Card>
	<h2>Carbon intensity now</h2>

	<p class="value">{value} <small>gCO₂/kWh</small></p>

	{#if isForecast}
		<p class="note">Forecast: the actual value is not available yet</p>
	{/if}

	<!-- The word carries the meaning. The meter repeats it visually and is hidden from screen readers. -->
	<p class="badge">
		<span class="index">{intensity.index}</span>
		<span class="meter" aria-hidden="true">
			{#each INDEXES as _, i}
				<i class:filled={i < indexLevel}></i>
			{/each}
		</span>
	</p>
</Card>

<style>
	h2 {
		margin-bottom: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.value {
		font-size: var(--text-display);
		font-weight: 700;
		line-height: 1;
	}

	.value small {
		margin-left: var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-base);
		font-weight: 400;
	}

	.note {
		margin-top: var(--space-2);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		margin-top: var(--space-3);
		padding: 0 var(--space-3);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-md);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	/* inline-block so ::first-letter applies: "very low" shows as "Very low". */
	.index {
		display: inline-block;
	}

	.index::first-letter {
		text-transform: uppercase;
	}

	.meter {
		display: inline-flex;
		gap: 2px;
	}

	.meter i {
		width: 7px;
		height: var(--space-3);
		border: var(--border-width) solid var(--text);
	}

	.meter i.filled {
		background: var(--text);
	}
</style>
