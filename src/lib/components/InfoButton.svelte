<script lang="ts">
	import type { Snippet } from "svelte";

	/**
	 * An "i" button in a widget's top right corner that opens a short, plain-English note on what
	 * the widget shows. Put it inside a Card, next to the card's h2.
	 *
	 * It uses the browser's popover (the `popover` and `popovertarget` attributes), which brings the
	 * accessibility for free: the button reports whether the note is open, Escape and a click
	 * outside close it, and focus goes back to the button. No JavaScript of our own.
	 */
	let { title, children }: { title: string; children: Snippet } = $props();

	// A unique id per instance, the same on the server and in the browser, to tie the button to its
	// note and to name the CSS anchor the note is placed against.
	const id = $props.id();
</script>

<button
	type="button"
	class="info"
	popovertarget="{id}-info"
	aria-label="{title}: what this shows"
	style:anchor-name="--{id}"
>
	<svg viewBox="0 0 16 16" aria-hidden="true">
		<circle cx="8" cy="4.5" r="1.1" fill="currentColor" />
		<path d="M8 7.25v5" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" />
	</svg>
</button>

<div id="{id}-info" class="note" popover style:position-anchor="--{id}">
	<p class="note-title">{title}</p>
	{@render children()}
</div>

<style>
	/* In the card's top right corner (Card is position: relative). 1.75rem is over the 24px minimum
	   target size (WCAG 2.5.8). */
	.info {
		position: absolute;
		top: var(--space-3);
		right: var(--space-3);
		display: grid;
		place-items: center;
		width: 1.75rem;
		height: 1.75rem;
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text-muted);
		cursor: pointer;
		transition:
			background-color var(--transition-fast),
			color var(--transition-fast);
	}

	.info:hover {
		background: var(--surface-sunken);
		color: var(--text);
	}

	svg {
		width: 1rem;
		height: 1rem;
	}

	/* The note, a small raised panel. The browser's default popover styles centre it in the window;
	   where CSS anchor positioning is supported, it opens just under the button instead, lined up
	   with its right edge, and flips above or to the other side if there is no room. */
	.note {
		width: min(20rem, calc(100vw - 2rem));
		padding: var(--space-3) var(--space-4);
		border: var(--border-width) solid var(--hairline);
		border-radius: var(--radius-md);
		background: var(--surface);
		box-shadow: var(--shadow-raised);
		color: var(--text);
		font-size: var(--text-sm);
		line-height: 1.5;
	}

	@supports (position-area: bottom) {
		.note {
			inset: auto;
			margin: var(--space-2) 0 0;
			position-area: bottom span-left;
			position-try-fallbacks: flip-block, flip-inline;
		}
	}

	.note-title {
		margin-bottom: var(--space-1);
		font-weight: 600;
	}

	/* The note's own paragraphs, passed in as children. */
	.note :global(p + p) {
		margin-top: var(--space-2);
	}
</style>
