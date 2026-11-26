<script lang="ts">
	import type { Accuracy } from "#lib/metrics/accuracy.ts";

	/** Null when no period in the range has an actual yet. */
	let { accuracy }: { accuracy: Accuracy | null } = $props();

	// Numbers are rounded here, where they are shown (`forecastAccuracy` does not round).
	const meanAbsoluteError = $derived(accuracy === null ? "" : accuracy.meanAbsoluteError.toFixed(1));
	const withinTenPercent = $derived(
		accuracy === null ? "" : `${Math.round(accuracy.withinTenPercent * 100)}%`
	);

	// Bias has a direction, so it is written as words. A positive bias means the forecasts ran high.
	const bias = $derived.by(() => {
		if (accuracy === null) return "";
		const size = Math.abs(accuracy.bias).toFixed(1);
		if (size === "0.0") return "None";
		return `${size} gCO₂/kWh too ${accuracy.bias > 0 ? "high" : "low"}`;
	});
</script>

{#if accuracy}
	<dl class="stats">
		<div>
			<dt>Average error</dt>
			<dd>{meanAbsoluteError} <small>gCO₂/kWh</small></dd>
		</div>
		<div>
			<dt>Forecast bias</dt>
			<dd>{bias}</dd>
		</div>
		<div>
			<dt>Within 10% of actual</dt>
			<dd>{withinTenPercent} <small>of periods</small></dd>
		</div>
	</dl>
	<p class="note">Based on {accuracy.count} periods that have an actual value.</p>
{:else}
	<p class="note">There are no actual values for this range yet, so accuracy cannot be measured.</p>
{/if}

<style>
	/* Three stat tiles on the sunken surface, as many per row as fit (each at least 11rem). */
	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 11rem), 1fr));
		gap: var(--space-2);
	}

	.stats div {
		padding: var(--space-3) var(--space-4);
		border-radius: var(--radius-md);
		background: var(--surface-sunken);
	}

	dt {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	dd {
		font-size: var(--text-lg);
		font-weight: 600;
	}

	dd small {
		color: var(--text-muted);
		font-size: var(--text-sm);
		font-weight: 400;
	}

	/* The bottom margin separates the summary from whatever follows it, such as the chart. */
	.note {
		margin: var(--space-2) 0 var(--space-4);
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
</style>
