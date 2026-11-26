<script lang="ts">
	/**
	 * A button for checking both themes while developing: it cycles System, Light and Dark. Only the
	 * layout's `{#if dev}` renders it, so it is not in the production build.
	 */
	type Theme = "system" | "light" | "dark";

	const NEXT: Record<Theme, Theme> = { system: "light", light: "dark", dark: "system" };
	const LABELS: Record<Theme, string> = { system: "System", light: "Light", dark: "Dark" };

	let theme = $state<Theme>("system");

	// $effect, because this syncs Svelte state with something outside the component: the <html>
	// element, which Svelte does not render. Every colour token uses light-dark(), so setting
	// color-scheme there switches the whole page. An empty string removes the inline style, and the
	// stylesheet's `light dark` (follow the system) applies again. The effect runs only in the
	// browser, after the component mounts, and again whenever `theme` changes. The function it
	// returns runs before each re-run and on unmount, so the page is never left stuck on a theme.
	$effect(() => {
		const root = document.documentElement;
		root.style.colorScheme = theme === "system" ? "" : theme;
		return () => {
			root.style.colorScheme = "";
		};
	});
</script>

<button type="button" class="toggle" onclick={() => (theme = NEXT[theme])}>
	<span class="tag">Dev</span>
	Theme: {LABELS[theme]}
</button>

<style>
	/* Fixed in a corner, so it stays in reach on every page without moving the layout. */
	.toggle {
		position: fixed;
		right: var(--space-4);
		bottom: var(--space-4);
		z-index: 10;
		display: inline-flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2) var(--space-4) var(--space-2) var(--space-2);
		border: var(--border-width) solid var(--border);
		border-radius: var(--radius-pill);
		background: var(--surface);
		color: var(--text);
		box-shadow: var(--shadow-widget);
		font: inherit;
		font-size: var(--text-sm);
		font-weight: 500;
		cursor: pointer;
	}

	.tag {
		padding: 0 var(--space-2);
		border-radius: var(--radius-pill);
		background: var(--text);
		color: var(--surface);
		font-size: var(--text-xs);
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
</style>
