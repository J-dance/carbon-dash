<script lang="ts">
	import { page } from "$app/state";
	import { withParam } from "#lib/url.ts";

	interface Option {
		/**
		 * What goes in the URL. Null means "no filter": the param is removed rather than set to
		 * something like "all", because the endpoint rejects values it does not know.
		 */
		value: string | null;
		label: string;
	}

	let {
		label,
		param,
		options,
		current
	}: { label: string; param: string; options: Option[]; current: string | null } = $props();

	// Which option is current, as a position (0, 1, 2…), for the sliding thumb. -1 if none is, which
	// hides the thumb.
	const currentIndex = $derived(options.findIndex((option) => option.value === current));
</script>

<nav aria-label={label}>
	<span class="label">{label}</span>
	<!-- The thumb (.track::before) reads its size and place from these two custom properties. -->
	<div
		class="track"
		class:has-current={currentIndex !== -1}
		style:--count={options.length}
		style:--current={currentIndex}
	>
		{#each options as option (option.value)}
			<!-- reset="false": after the navigation, stay where you are on the page and keep keyboard focus on the link you pressed. -->
			<a
				href={withParam(page.url.search, param, option.value)}
				aria-current={option.value === current ? "true" : undefined}
				data-sveltekit-reset="false"
			>
				{option.label}
			</a>
		{/each}
	</div>
</nav>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-2) var(--space-3);
	}

	.label {
		color: var(--text-muted);
		font-size: var(--text-sm);
	}

	/* A segmented control that works like the nav switch: the options sit in one rounded track, in
	   equal columns, with a thumb behind the current one that slides across when you pick another.
	   Equal columns mean the thumb is always one column wide and moves a whole column at a time.
	   position: relative so the thumb is placed inside the track. */
	.track {
		position: relative;
		display: grid;
		grid-template-columns: repeat(var(--count), 1fr);
		padding: 3px;
		border-radius: var(--radius-pill);
		background: var(--surface-sunken);
		box-shadow: inset 0 0 0 var(--border-width) var(--hairline);
	}

	/* The thumb: one column wide, moved along by --current columns. The page stays mounted when a
	   filter changes (only its data changes), so the transition plays. --transition-slide is 0s for
	   reduced motion. */
	.track::before {
		content: "";
		position: absolute;
		top: 3px;
		bottom: 3px;
		left: 3px;
		width: calc((100% - 6px) / var(--count));
		border-radius: var(--radius-pill);
		background: var(--text);
		opacity: 0;
		transform: translateX(calc(var(--current) * 100%));
		transition:
			transform var(--transition-slide),
			opacity var(--transition-fast);
	}

	.has-current::before {
		opacity: 1;
	}

	/* position: relative lifts the links above the thumb. A little less padding on a phone, so the
	   four tier options fit across 320px. */
	a {
		position: relative;
		padding: var(--space-1) var(--space-2);
		border-radius: var(--radius-pill);
		color: var(--text);
		font-size: var(--text-sm);
		font-weight: 500;
		text-align: center;
		white-space: nowrap;
		text-decoration: none;
		transition: color var(--transition-slide);
	}

	@media (min-width: 40rem) {
		a {
			padding-inline: var(--space-3);
		}
	}

	a:not([aria-current]):hover {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	/* The current option's text is inverted on the thumb, like the current page in the nav: a
	   change in lightness that reads without colour vision. Screen readers get it from
	   aria-current. */
	a[aria-current="true"] {
		color: var(--surface);
	}
</style>
