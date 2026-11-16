<script lang="ts">
  import favicon from "#lib/assets/favicon.svg";
  import "./layout.css";
  import type { LayoutProps } from "./$types";

  let { children }: LayoutProps = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
</svelte:head>

<nav>
  <a href="/">Dashboard</a>
  <a href="/regions">Regions</a>
</nav>
{@render children()}

<footer>This is a footer</footer>

<style>
  nav {
    display: flex;
    align-items: center;
    gap: 2em;
    height: auto;
    border-bottom: 1px solid black;
    padding: 1em;
  }

  footer {
    display: flex;
    align-items: center;
    justify-content: center;
    height: auto;
    border-top: 1px solid black;
    padding: 1em;
  }
</style>
