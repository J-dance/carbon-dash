<script lang="ts">
	import { page } from "$app/state";
</script>

<svelte:head>
	<title>{page.status} | Carbon Dash</title>
</svelte:head>

{#if page.status >= 500}
	<h1>Something went wrong</h1>
	<p>{page.error?.message}</p>
	<p>
		This is usually temporary.
		<!-- data-sveltekit-reload forces a full page load, so the data is fetched again. -->
		<a href={page.url.pathname} data-sveltekit-reload>Try again</a>
		in a minute.
	</p>
{:else if page.status === 400}
	<h1>That link does not look right</h1>
	<p>{page.error?.message}</p>
	<!-- pathname has no query string, so this opens the page with its default filters. -->
	<p><a href={page.url.pathname}>Open this page with the default filters</a>.</p>
{:else}
	<h1>Page not found</h1>
	<p>We could not find that page. <a href="/">Go to the dashboard</a>.</p>
{/if}
