<script lang="ts">
	import "@fontsource-variable/newsreader/opsz.css";
	import "@fontsource-variable/schibsted-grotesk";
	import { dev } from "$app/env";
	import { page } from "$app/state";
	import favicon from "#lib/assets/favicon.svg";
	import DevThemeToggle from "#lib/components/DevThemeToggle.svelte";
	import "./layout.css";
	import type { LayoutProps } from "./$types";

	let { children }: LayoutProps = $props();

	const NAV_LINKS = [
		{ href: "/", label: "Dashboard" },
		{ href: "/regions", label: "Regions" }
	];

	// Tells screen readers which link is where they are: "page" on that exact page, and "true" on a
	// page inside its section (a region's detail page is inside Regions). Read in the template, so
	// it updates when page.url changes.
	function currentFor(href: string): "page" | "true" | undefined {
		const path = page.url.pathname;
		if (path === href) return "page";
		if (href !== "/" && path.startsWith(`${href}/`)) return "true";
		return undefined;
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<!-- Lets keyboard users jump past the nav. Hidden until it receives focus. -->
<a class="skip-link" href="#main">Skip to main content</a>

<header class="masthead">
	<div class="bar">
		<p class="brand">
			<a class="wordmark" href="/">Carbon Dash</a>
			<span class="tagline">Britain's electricity, half hour by half hour</span>
		</p>
		<nav aria-label="Main">
			{#each NAV_LINKS as link (link.href)}
				<a href={link.href} aria-current={currentFor(link.href)}>{link.label}</a>
			{/each}
		</nav>
	</div>
</header>

<main id="main">
	{@render children()}
</main>

<footer>
	<p>
		Data from the
		<a href="https://carbon-intensity.github.io/api-definitions/">Carbon Intensity API</a>
	</p>
</footer>

<!-- `dev` is a constant, false in a production build, so the toggle is left out of it entirely. -->
{#if dev}
	<DevThemeToggle />
{/if}

<style>
	.masthead {
		padding: var(--space-4) var(--gutter) 0;
	}

	/* The masthead is a widget too: the same surface, radius and shadow as the cards below it. */
	.bar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-3) var(--space-6);
		max-width: var(--content-max-width);
		margin-inline: auto;
		padding: var(--space-3) var(--space-4) var(--space-3) var(--space-6);
		border: var(--border-width) solid var(--hairline);
		border-radius: var(--radius-lg);
		background: var(--surface);
		box-shadow: var(--shadow-widget);
	}

	.brand {
		display: flex;
		flex-direction: column;
	}

	.wordmark {
		color: var(--text);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 700;
		line-height: 1.2;
		letter-spacing: -0.01em;
		text-decoration: none;
	}

	.tagline {
		color: var(--text-muted);
		font-size: var(--text-xs);
	}

	nav {
		display: flex;
		gap: var(--space-1);
	}

	nav a {
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-pill);
		color: var(--text);
		font-size: var(--text-sm);
		font-weight: 500;
		text-decoration: none;
		transition: background-color var(--transition-fast);
	}

	nav a:hover {
		background: var(--bg);
	}

	/* The current page's pill is inverted (dark on light, or light on dark): a change in lightness
	   that reads without colour vision, and screen readers get it from aria-current. */
	nav a[aria-current] {
		background: var(--text);
		color: var(--surface);
	}

	footer {
		padding: var(--space-6) var(--gutter);
		color: var(--text-muted);
		font-size: var(--text-sm);
		text-align: center;
	}

	/* Moved off-screen, not display: none, so it stays in the tab order. */
	.skip-link {
		position: absolute;
		left: -9999px;
		z-index: 1;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-pill);
		background: var(--text);
		color: var(--surface);
	}

	.skip-link:focus {
		left: var(--space-4);
		top: var(--space-4);
	}
</style>
