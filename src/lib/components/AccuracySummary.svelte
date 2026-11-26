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
{:else}
	<p class="note">There are no actual values for this range yet, so accuracy cannot be measured.</p>
{/if}

<style>
	/* One sunken panel with a row per stat, split by thin lines in the widget's colour. Rows rather
	   than separate tiles keep the widget short, so the dashboard's top row is too. Each row is one
	   line, label on the left and value on the right; a value that does not fit wraps under it. */
	.stats {
		padding: 0 var(--space-3);
		border-radius: var(--radius-md);
		background: var(--surface-sunken);
	}

	.stats div {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 0 var(--space-3);
		padding: var(--space-2) 0;
	}

	.stats div + div {
		border-top: 2px solid var(--surface);
	}

	dt {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	dd {
		font-size: var(--text-base);
		font-weight: 600;
	}

	dd small {
		color: var(--text-muted);
		font-size: var(--text-sm);
		font-weight: 400;
	}

	.note {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}
</style>
