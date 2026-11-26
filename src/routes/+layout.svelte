<script lang="ts">
	import "@fontsource-variable/newsreader/opsz.css";
	import "@fontsource-variable/schibsted-grotesk";
	import { page } from "$app/state";
	import favicon from "#lib/assets/favicon.svg";
	import ThemeToggle from "#lib/components/ThemeToggle.svelte";
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

<!-- The theme toggle and the nav, at the top right of the page, staying there as you scroll.
	Each page's own opening (PageHeader) has the headline. -->
<header class="masthead">
	<ThemeToggle />
	<!-- Two pages, so the nav is a switch: still two links (choosing a page is navigation), with a
		thumb that slides behind the current one. -->
	<nav class="switch" aria-label="Main">
		{#each NAV_LINKS as link (link.href)}
			<a href={link.href} aria-current={currentFor(link.href)}>{link.label}</a>
		{/each}
	</nav>
</header>

<main id="main">
	{@render children()}
</main>

<footer>
	<p class="brand">Carbon Dash</p>
	<p>
		Data from the
		<a href="https://carbon-intensity.github.io/api-definitions/">Carbon Intensity API</a>
	</p>
</footer>

<style>
	/* The theme toggle and nav switch on a row of their own at the top right, lined up with the
	   content's right edge like `main`. The page's headline starts where this row ends, so the top
	   of the headline lines up with the bottom of the nav. Sticky, so the nav stays in reach while
	   you scroll. html's scroll-padding-top (layout.css) keeps focused elements from scrolling under
	   it (WCAG 2.4.11, focus not obscured). */
	.masthead {
		position: sticky;
		top: 0;
		z-index: 5;
		display: flex;
		justify-content: flex-end;
		gap: var(--space-2);
		width: 100%;
		max-width: calc(var(--content-max-width) + 2 * var(--gutter));
		margin-inline: auto;
		padding: var(--space-3) var(--gutter) 0;
	}

	/* On a phone the nav row is centred, so it sits evenly above the page rather than off to one
	   side. */
	@media (max-width: 40rem) {
		.masthead {
			justify-content: center;
		}
	}

	/* The switch: two equal halves in a rounded track, so the thumb moves by exactly its own width.
	   position: relative so the thumb (::before) is placed inside it. */
	.switch {
		position: relative;
		display: grid;
		grid-template-columns: 1fr 1fr;
		padding: 6px;
		border: var(--border-width) solid var(--hairline);
		border-radius: var(--radius-pill);
		background: var(--surface);
		box-shadow: var(--shadow-widget);
	}

	/* The thumb: one inverted shape behind the current link. It sits on the left half and slides
	   to the right half when Regions is current, so moving between pages animates it (the layout
	   stays mounted on navigation, so this element and its transition persist). --transition-slide
	   is 0s for reduced motion. A page in neither section (the error page) has no thumb. */
	.switch::before {
		content: "";
		position: absolute;
		top: 6px;
		bottom: 6px;
		left: 6px;
		width: calc(50% - 6px);
		border-radius: var(--radius-pill);
		background: var(--text);
		transition:
			transform var(--transition-slide),
			opacity var(--transition-fast);
	}

	.switch:has(a:nth-child(2)[aria-current])::before {
		transform: translateX(100%);
	}

	.switch:not(:has(a[aria-current]))::before {
		opacity: 0;
	}

	/* position: relative lifts the links above the thumb. */
	.switch a {
		position: relative;
		padding: var(--space-2) var(--space-4);
		border-radius: var(--radius-pill);
		color: var(--text);
		font-size: var(--text-sm);
		font-weight: 500;
		line-height: 1.2;
		text-align: center;
		text-decoration: none;
		transition: color var(--transition-slide);
	}

	.switch a:not([aria-current]):hover {
		text-decoration: underline;
		text-underline-offset: 0.2em;
	}

	/* The current page's text is inverted on the thumb: a change in lightness that reads without
	   colour vision, and screen readers get it from aria-current. */
	.switch a[aria-current] {
		color: var(--surface);
	}

	/* The app's name, with the data credit stacked under it. */
	footer {
		display: grid;
		gap: var(--space-1);
		padding: var(--space-6) var(--gutter);
		color: var(--text-muted);
		font-size: var(--text-sm);
		text-align: center;
	}

	/* The app's name lives here, since the masthead is only the nav. */
	.brand {
		color: var(--text);
		font-family: var(--font-serif);
		font-size: var(--text-lg);
		font-weight: 700;
	}

	/* Moved off-screen, not display: none, so it stays in the tab order. Above the sticky masthead
	   (z-index 5), so it is not hidden behind it when it appears. */
	.skip-link {
		position: absolute;
		left: -9999px;
		z-index: 10;
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
