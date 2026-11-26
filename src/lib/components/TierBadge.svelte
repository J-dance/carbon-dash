<script lang="ts">
	import { TIER_LABELS, type Tier } from "#lib/regions/types.ts";

	let { tier }: { tier: Tier } = $props();
</script>

<!-- Icon, label and colour all say the same thing, so no one of them is relied on alone. -->
<span class="badge" data-tier={tier}>
	<!-- The label next to it already says the tier, so the icon is hidden from screen readers. -->
	<svg
		class="icon"
		viewBox="0 0 16 16"
		aria-hidden="true"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{#if tier === "top"}
			<path d="M3 8.5 6.5 12 13 4.5" />
		{:else if tier === "middle"}
			<path d="M3.5 8h9" />
		{:else}
			<path d="M8 3v6.5M8 13h.01" />
		{/if}
	</svg>
	{TIER_LABELS[tier]}
</span>

<style>
	.badge {
		display: inline-flex;
		align-items: center;
		gap: var(--space-1);
		padding: 2px var(--space-2) 2px var(--space-1);
		border: var(--border-width) solid var(--tier-border);
		border-radius: var(--radius-pill);
		background: var(--tier-bg);
		color: var(--tier-text);
		font-size: var(--text-sm);
		font-weight: 600;
	}

	/* One place maps a tier to its colours, so the rules above stay the same for all three. */
	[data-tier="top"] {
		--tier-bg: var(--tier-top-bg);
		--tier-text: var(--tier-top-text);
		--tier-border: var(--tier-top-border);
	}

	[data-tier="middle"] {
		--tier-bg: var(--tier-middle-bg);
		--tier-text: var(--tier-middle-text);
		--tier-border: var(--tier-middle-border);
	}

	[data-tier="bottom"] {
		--tier-bg: var(--tier-bottom-bg);
		--tier-text: var(--tier-bottom-text);
		--tier-border: var(--tier-bottom-border);
	}

	.icon {
		width: 1em;
		height: 1em;
	}
</style>
