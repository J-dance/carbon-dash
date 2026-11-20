<script lang="ts">
	import Card from "#lib/components/Card.svelte";
	import type { Fuel } from "#lib/api/types.ts";
	import { groupMix } from "#lib/metrics/fuel-groups.ts";
	import type { FuelGroup } from "#lib/metrics/types.ts";

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

<Card>
	<h2>Fuel mix now</h2>

	<div class="bar" role="img" aria-label={summary}>
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
				{segment.label} {Math.round(segment.percent)}%
			</li>
		{/each}
	</ul>
</Card>

<style>
	.bar {
		display: flex;
		width: 100%;
		height: var(--space-6);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-sm);
		overflow: hidden;
	}

	/* Inset shadow, not a border, so a 0% segment leaves no sliver. */
	.segment {
		box-shadow: inset calc(var(--space-1) / -2) 0 0 var(--surface);
	}

	.legend {
		display: flex;
		flex-wrap: wrap;
		gap: var(--space-2) var(--space-4);
		margin-top: var(--space-2);
		list-style: none;
		font-size: var(--text-sm);
	}

	.swatch {
		display: inline-block;
		width: var(--space-3);
		height: var(--space-3);
		border: var(--border-width) solid var(--border);
		vertical-align: baseline;
	}

	.renewable {
		background: var(--accent);
	}

	.lowCarbon {
		background: var(--text-muted);
	}

	.fossil {
		background: var(--text);
	}

	/* Hatched, so this group differs by pattern and not only by shade. */
	.importAndOther {
		background: repeating-linear-gradient(
			45deg,
			var(--surface),
			var(--surface) 3px,
			var(--border) 3px,
			var(--border) 6px
		);
	}
</style>
