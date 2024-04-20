
<header>
  <h1><a href="/">callthis.eth</a></h1>
  <ThemeButton />
</header>

<main>
    <slot />
</main>

<footer>
  <a target="_blank" href="https://github.com/shazow/callthis">
    <OpenSourceIcon /> Open Source
  </a>
</footer>

<script lang="ts">
  import "../style.scss";
  import OpenSourceIcon from "../lib/icons/openSource.svelte"
  import ThemeButton from "$lib/ThemeButton.svelte";
</script>
