<script lang="ts">
	import type { Snippet } from "svelte";

	/** A dashboard widget: a raised surface that holds one idea, with an `<h2>` as its title. */
	let { children }: { children: Snippet } = $props();
</script>

<article class="widget">{@render children()}</article>

<style>
	/* min-width: 0 lets a widget shrink inside a grid cell instead of pushing the grid wider. The
	   padding grows a little with the screen, like the page gutter. */
	.widget {
		min-width: 0;
		padding: clamp(var(--space-4), 2.5vw, var(--space-6));
		border: var(--border-width) solid var(--hairline);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-widget);
	}

	/* Every widget title looks the same, so the components that use Card only write an <h2>.
	   :global reaches the h2 they render inside the snippet, and `.widget` keeps it to widgets. */
	.widget :global(h2) {
		margin-bottom: var(--space-4);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.01em;
	}
</style>
