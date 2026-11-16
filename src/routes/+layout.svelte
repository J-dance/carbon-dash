<script lang="ts">
	import favicon from "#lib/assets/favicon.svg";
	import "./layout.css";
	import type { LayoutProps } from "./$types";

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Lets keyboard users jump past the nav. Hidden until it receives focus. -->
<a class="skip-link" href="#main">Skip to main content</a>

<header>
	<nav aria-label="main">
		<a href="/">Dashboard</a>
		<a href="/regions">Regions</a>
	</nav>
</header>

<main id="main">
	{@render children()}
</main>

<footer>
	<p>
		Data from the
		<a href="https://carbon-intensity.github.io/api-definitions/"
			>Carbon Intensity API</a
		>
	</p>
</footer>

<style>
	nav {
		display: flex;
		align-items: center;
		gap: var(--space-6);
		height: auto;
		border-bottom: var(--border-width) solid var(--border);
		padding: var(--space-4);
	}

	footer {
		display: flex;
		align-items: center;
		justify-content: center;
		height: auto;
		border-top: var(--border-width) solid var(--border);
		padding: var(--space-4);
	}

	/* Moved off-screen, not display: none, so it stays in the tab order. */
	.skip-link {
		position: absolute;
		left: -9999px;
		z-index: 1;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-sm);
		background: var(--accent);
		color: var(--accent-contrast);
	}

	.skip-link:focus {
		left: var(--space-4);
		top: var(--space-4);
	}
</style>
