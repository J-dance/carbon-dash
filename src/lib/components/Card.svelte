<script lang="ts">
	import type { Snippet } from "svelte";

	/**
	 * A dashboard widget: a raised surface that holds one idea, with an `<h2>` as its title. It rises
	 * into place when it appears; `enter` is its place in that staggered entrance (see "Widget
	 * entrance" in layout.css). Leave it out to inherit `--enter` from a wrapper.
	 */
	let { children, enter }: { children: Snippet; enter?: number } = $props();
</script>

<article class="widget rise" style:--enter={enter}>{@render children()}</article>

<style>
	/* min-width: 0 lets a widget shrink inside a grid cell instead of pushing the grid wider. The
	   padding grows with the screen, from 0.75rem on a small phone (where the regions table needs
	   every pixel to fit 320px) to 1.5rem on a wide screen. */
	/* position: relative so an InfoButton inside sits in the widget's top right corner. */
	.widget {
		position: relative;
		min-width: 0;
		padding: clamp(var(--space-3), 2.5vw, var(--space-6));
		border: var(--border-width) solid var(--hairline);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-widget);
	}

	/* Every widget title looks the same, so the components that use Card only write an <h2>.
	   :global reaches the h2 they render inside the snippet, and `.widget` keeps it to widgets. */
	.widget :global(h2) {
		/* Room on the right for the InfoButton in the corner, so a long title wraps before it. */
		padding-right: var(--space-8);
		margin-bottom: var(--space-4);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 600;
		line-height: 1.2;
		letter-spacing: -0.01em;
	}
</style>
