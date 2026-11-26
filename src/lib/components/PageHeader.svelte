<script lang="ts">
	import type { Snippet } from "svelte";

	/**
	 * The opening of a page, set like a news article: the page's h1 with a kicker (a short line
	 * such as the period shown) under it, and a standfirst that says what the page shows. The
	 * kicker is a snippet so a page can put markup in it, such as `<time>` elements. `live` makes the
	 * kicker's dot pulse, for a page that shows the latest data as it comes in.
	 */
	let {
		title,
		kicker,
		standfirst,
		live = false
	}: { title: string; kicker?: Snippet; standfirst?: string | null; live?: boolean } = $props();
</script>

<header class="lede">
	<!-- The title and kicker are one group, so they stay together and the standfirst sits beside
		the pair (on a desktop) rather than beside the title alone. -->
	<div class="heading">
		<h1>{title}</h1>
		{#if kicker}
			<p class="kicker">
				<!-- A small marker, as news sites use beside a kicker. It says nothing the words do not,
					so it is hidden from screen readers. -->
				<span class="dot" class:live aria-hidden="true"></span>
				{@render kicker()}
			</p>
		{/if}
	</div>
	{#if standfirst}
		<p class="standfirst">{standfirst}</p>
	{/if}
</header>

<style>
	/* Stacked on a phone: title, kicker, standfirst. `position` and `z-index` make the header its
	   own stacking layer, so the ::before below sits behind the text but in front of the dot grid. */
	.lede {
		position: relative;
		z-index: 0;
		display: grid;
		gap: var(--space-3);
		/* A clear gap below, so the opening stands apart from the filters and widgets under it. Above,
		   a gap from the nav row on smaller screens, where the nav sits on its own centred row and
		   the headline would otherwise crowd it. */
		margin: var(--space-6) 0 var(--space-8);
	}

	/* On a desktop, no gap above: the headline starts right where the nav row ends, so the top of
	   the headline lines up with the bottom of the nav. */
	@media (min-width: 60rem) {
		.lede {
			margin-top: 0;
		}
	}

	/* Fades the dot grid behind the text: a patch of mostly-opaque canvas the size of the header,
	   with a soft blurred edge (the shadow) so the dots fade back in around it rather than stopping
	   at a line. At 65% the dots still show through, so the canvas reads as one surface, while the
	   text stays clear of them. It fits whatever height the header wraps to, on any screen. */
	.lede::before {
		content: "";
		position: absolute;
		inset: 0;
		z-index: -1;
		--veil: color-mix(in srgb, var(--bg) 65%, transparent);
		background: var(--veil);
		box-shadow: 0 0 var(--space-3) var(--space-1) var(--veil);
	}

	.heading {
		display: grid;
		gap: var(--space-2);
	}

	.kicker {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0 var(--space-1);
		color: var(--text-muted);
		font-size: var(--text-xs);
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.dot {
		position: relative;
		width: 0.5rem;
		height: 0.5rem;
		margin-right: var(--space-1);
		border-radius: var(--radius-pill);
		background: var(--accent);
	}

	/* A live dot sends out a soft ring every few seconds, like a news site's "live" marker: a copy
	   of the dot that grows and fades. Slow and faint, so it is noticed without pulling the eye.
	   Turned off for reduced motion, where the dot stays still. */
	.live::after {
		content: "";
		position: absolute;
		inset: 0;
		border-radius: inherit;
		background: inherit;
		animation: pulse 2.4s ease-out infinite;
	}

	@keyframes pulse {
		from {
			opacity: 0.5;
			transform: scale(1);
		}
		to {
			opacity: 0;
			transform: scale(2.6);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.live::after {
			animation: none;
			opacity: 0;
		}
	}

	.standfirst {
		max-width: 60ch;
		font-family: var(--font-serif);
		font-size: var(--text-standfirst);
		line-height: 1.35;
		text-wrap: pretty;
	}

	/*
	 * Entrance. The opening comes into focus rather than rising like the widgets below it, so it
	 * reads as the page's headline settling in: each part sharpens from a soft blur as it fades in,
	 * the title first, then the kicker, then the standfirst, one chart step (--reveal-step) apart.
	 * The same length and easing as the rest of the motion theme (layout.css), and reduced motion
	 * makes it instant. `backwards` keeps each part hidden until its turn.
	 */
	@keyframes focus-in {
		from {
			opacity: 0;
			filter: blur(6px);
		}
	}

	h1,
	.kicker,
	.standfirst {
		animation: focus-in var(--reveal-duration) var(--reveal-ease) backwards;
	}

	.kicker {
		animation-delay: var(--reveal-step);
	}

	.standfirst {
		animation-delay: calc(var(--reveal-step) * 2);
	}

	/* On a desktop the standfirst moves beside the title and kicker, split from them by a rule, and
	   is centred on their shared height. fit-content(66%) gives the heading the room it needs, up
	   to two thirds of the width; the standfirst takes the rest. */
	@media (min-width: 60rem) {
		.lede {
			grid-template-columns: fit-content(66%) minmax(0, 1fr);
			gap: var(--space-6);
			align-items: center;
		}

		.standfirst {
			max-width: 50ch;
			padding-left: var(--space-6);
			border-left: var(--border-width) solid var(--border);
		}
	}
</style>
