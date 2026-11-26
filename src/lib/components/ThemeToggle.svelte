<script lang="ts">
	import { onMount } from "svelte";
	import { THEME_STORAGE_KEY } from "#lib/theme.ts";

	/**
	 * Switches between the light and dark theme. Until it is pressed the page follows the system
	 * setting; after that the choice is saved, and app.html applies it before the page paints on
	 * the next visit, so it does not flash the other theme first.
	 */

	// False on the server, which cannot know the theme. onMount sets the real value in the browser.
	let dark = $state(false);

	// Every colour token uses light-dark() (layout.css), so setting color-scheme on <html> switches
	// the whole page. Done right here in the click handler, not in an $effect: it happens because
	// of the click, and an event handler is the place for that.
	function toggle() {
		dark = !dark;
		const scheme = dark ? "dark" : "light";
		document.documentElement.style.colorScheme = scheme;
		localStorage.setItem(THEME_STORAGE_KEY, scheme);
	}

	// Reads what the page is showing now: the saved choice if there is one, otherwise the system's.
	onMount(() => {
		const saved = localStorage.getItem(THEME_STORAGE_KEY);
		dark = saved === null ? matchMedia("(prefers-color-scheme: dark)").matches : saved === "dark";
	});

	// The button says what pressing it does, so its name changes with the theme.
	const label = $derived(dark ? "Switch to light theme" : "Switch to dark theme");
</script>

<button type="button" class="toggle" onclick={toggle} aria-label={label} title={label}>
	<svg
		viewBox="0 0 24 24"
		aria-hidden="true"
		fill="none"
		stroke="currentColor"
		stroke-width="2"
		stroke-linecap="round"
		stroke-linejoin="round"
	>
		{#if dark}
			<!-- Sun: pressing it brings the light back. -->
			<circle cx="12" cy="12" r="4" />
			<path
				d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
			/>
		{:else}
			<!-- Moon: pressing it turns the page dark. -->
			<path d="M20.5 14.5A8.5 8.5 0 0 1 9.5 3.5a8.5 8.5 0 1 0 11 11Z" />
		{/if}
	</svg>
</button>

<style>
	/* A round button the same height as the nav switch beside it, on the same raised surface. */
	.toggle {
		display: grid;
		place-items: center;
		width: 2.9375rem;
		height: 2.9375rem;
		border: var(--border-width) solid var(--hairline);
		border-radius: var(--radius-pill);
		background: var(--surface);
		box-shadow: var(--shadow-widget);
		color: var(--text);
		cursor: pointer;
		transition: background-color var(--transition-fast);
	}

	.toggle:hover {
		background: var(--bg);
	}

	svg {
		width: 1.125rem;
		height: 1.125rem;
	}
</style>
