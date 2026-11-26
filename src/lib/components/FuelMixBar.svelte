<script lang="ts">
	import type { Fuel } from "#lib/api/types.ts";
	import { groupMix } from "#lib/metrics/fuel-groups.ts";
	import type { FuelGroup } from "#lib/metrics/types.ts";

	/**
	 * A fuel mix as one stacked bar of four groups, with a legend that gives each share as text.
	 * Used by the national fuel mix card and the region preview panel.
	 */
	let { mix }: { mix: Record<Fuel, number> } = $props();

	// Order and wording of the groups, shared by the bar and the legend.
	const GROUPS: { group: FuelGroup; label: string }[] = [
		{ group: "renewable", label: "Renewable" },
		{ group: "lowCarbon", label: "Other low-carbon" },
		{ group: "fossil", label: "Fossil" },
		{ group: "importAndOther", label: "Imports and other" }
	];

	// $derived: recalculated whenever `mix` changes, so no $effect is needed.
	const segments = $derived.by(() => {
		const totals = groupMix(mix);
		return GROUPS.map(({ group, label }) => ({
			group,
			label,
			percent: totals[group]
		}));
	});

	const summary = $derived(
		segments.map((s) => `${s.label} ${Math.round(s.percent)}%`).join(", ")
	);
</script>

<!-- `reveal` is the shared chart entrance (see layout.css), order 0: the first chart to appear. -->
<div class="bar reveal" role="img" aria-label={summary}>
	{#each segments as segment}
		<div
			class="segment {segment.group}"
			style:width="{segment.percent}%"
		></div>
	{/each}
</div>

<!-- The legend carries the numbers as text, so the bar never relies on colour alone. -->
<ul class="legend">
	{#each segments as segment}
		<li>
			<span class="swatch {segment.group}" aria-hidden="true"></span>
			<span class="label">{segment.label}</span>
			<strong>{Math.round(segment.percent)}%</strong>
		</li>
	{/each}
</ul>

<style>
	.bar {
		display: flex;
		width: 100%;
		height: 2.25rem;
		border-radius: var(--radius-md);
		background: var(--surface);
		overflow: hidden;
	}

	/* A gap between segments, drawn as an inset shadow in the widget's colour rather than with a
	   flex gap, so a 0% segment leaves no extra space. */
	.segment {
		box-shadow: inset -3px 0 0 var(--surface);
	}

	/* As many columns as fit, each at least 14rem: one column on a phone or in the narrow preview
	   panel, and 2 by 2 in the dashboard widget, so a long label like "Other low-carbon" does not
	   wrap. */
	.legend {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(min(100%, 14rem), 1fr));
		gap: var(--space-2) var(--space-4);
		margin-top: var(--space-4);
		list-style: none;
		font-size: var(--text-sm);
	}

	.legend li {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.label {
		color: var(--text-muted);
	}

	/* Pushed to the end of the row so the shares line up in a column. */
	.legend strong {
		margin-left: auto;
		font-variant-numeric: tabular-nums;
	}

	.swatch {
		flex: none;
		width: var(--space-3);
		height: var(--space-3);
		border-radius: 3px;
	}

	/* Striped, like the progress bars in the design reference, and so it differs by pattern as
	   well as colour. The pale stripe is the same green mixed into the widget's colour. */
	.renewable {
		background: repeating-linear-gradient(
			-45deg,
			var(--data-renewable) 0 4px,
			color-mix(in srgb, var(--data-renewable) 35%, var(--surface)) 4px 7px
		);
	}

	.lowCarbon {
		background: var(--data-low-carbon);
	}

	.fossil {
		background: var(--data-fossil);
	}

	/* Hatched, so this group differs by pattern and not only by shade. */
	.importAndOther {
		background: repeating-linear-gradient(
			45deg,
			var(--data-import) 0 1.5px,
			var(--surface) 1.5px 4px
		);
	}
</style>
