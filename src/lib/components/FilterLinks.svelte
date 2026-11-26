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

</script>

<nav aria-label={label}>
	<span class="label">{label}</span>
	<div class="track">
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

	/* A segmented control: the options sit in one rounded track, like the pill toggles in the
	   design reference. It wraps if a phone is too narrow for every option. */
	.track {
		display: flex;
		flex-wrap: wrap;
		gap: 2px;
		padding: 3px;
		border-radius: var(--radius-pill);
		background: var(--surface-sunken);
		box-shadow: inset 0 0 0 var(--border-width) var(--hairline);
	}

	a {
		padding: var(--space-1) var(--space-3);
		border-radius: var(--radius-pill);
		color: var(--text);
		font-size: var(--text-sm);
		font-weight: 500;
		text-decoration: none;
		transition: background-color var(--transition-fast);
	}

	a:hover {
		background: var(--surface);
	}

	/* The current option is inverted, like the current page in the masthead: a change in lightness
	   that reads without colour vision. Screen readers get it from aria-current. */
	a[aria-current="true"] {
		background: var(--text);
		color: var(--surface);
		font-weight: 600;
	}
</style>
