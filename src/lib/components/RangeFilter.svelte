<script lang="ts">
	import { RANGES, type Range } from "#lib/regions/types.ts";
	import { page } from "$app/state";

	let { current }: { current: Range } = $props();

	const OPTION_LABELS: Record<Range, string> = {
		"24h": "24 hours",
		"7d": "7 days",
		"30d": "30 days"
	};

	// Built from `page.url.search` (a string), so the other params (tier, region) are kept.
	// The copy is what gets changed: the URL object itself is read-only.
	function hrefFor(range: Range) {
		const params = new URLSearchParams(page.url.search);
		params.set("range", range);
		return "?" + params;
	}
</script>

<nav aria-label="Period">
	<span class="label">Period</span>
	{#each RANGES as range (range)}
		<!-- reset="false": after the navigation, stay where you are on the page and keep keyboard focus on the link you pressed. -->
		<a
			href={hrefFor(range)}
			aria-current={range === current ? "true" : undefined}
			data-sveltekit-reset="false"
		>
			{OPTION_LABELS[range]}
		</a>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
		padding-bottom: var(--space-4);
	}

	.label {
		color: var(--text-muted);
	}

	/* The current period is bold and underlined as well as set apart by colour. */
	a[aria-current="true"] {
		color: var(--text);
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
</style>
