<script lang="ts">
	import { page } from "$app/state";

	interface Option {
		/** What goes in the URL. Null means "no filter": the param is removed. */
		value: string | null;
		label: string;
	}

	let {
		label,
		param,
		options,
		current
	}: { label: string; param: string; options: Option[]; current: string | null } = $props();

	// Built from `page.url.search` so the other params are kept. A null value removes the param
	// instead of setting it, because the endpoint rejects values it does not know.
	function hrefFor(value: string | null) {
		const params = new URLSearchParams(page.url.search);
		if (value === null) {
			params.delete(param);
		} else {
			params.set(param, value);
		}
		return "?" + params;
	}
</script>

<nav aria-label={label}>
	<span class="label">{label}</span>
	{#each options as option (option.value)}
		<!-- reset="false": after the navigation, stay where you are on the page and keep keyboard focus on the link you pressed. -->
		<a
			href={hrefFor(option.value)}
			aria-current={option.value === current ? "true" : undefined}
			data-sveltekit-reset="false"
		>
			{option.label}
		</a>
	{/each}
</nav>

<style>
	nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: var(--space-4);
	}

	.label {
		color: var(--text-muted);
	}

	/* The current option is bold and underlined as well as set apart by colour. */
	a[aria-current="true"] {
		color: var(--text);
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 0.25em;
	}
</style>
