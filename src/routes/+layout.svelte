
<header>
  <h1><a href="/">callthis.eth</a></h1>
  <ThemeButton />
</header>

<main>
    <slot />
</main>

<footer>
  <div><a href="/" style="color: var(--header-text-color);">callthis.eth</a></div>
  <div>
    <a target="_blank" href="https://github.com/shazow/callthis">
      <OpenSourceIcon /> <span>Open Source</span>
    </a>
  </div>
  <div>
    <EthereumIcon /> <span>Built for Ethereum</span>
  </div>
</footer>

<script lang="ts">
  import "../style.scss";
  import OpenSourceIcon from "../lib/icons/openSource.svelte"
  import EthereumIcon from "../lib/icons/ethereum.svelte"
  import ThemeButton from "$lib/ThemeButton.svelte";
</script>
