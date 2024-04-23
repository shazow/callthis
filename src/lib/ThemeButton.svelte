<script lang="ts">
  import Moon from './icons/moon.svelte';
  import Sun from './icons/sun.svelte';
  import {onMount} from "svelte";

  let currentTheme;

  onMount(() => {
    const theme = document.documentElement.dataset.theme;
    const userPrefersDarkMode = window.matchMedia(
      "(prefers-color-scheme: dark)"
    ).matches;
    if (theme) {
      setTheme(theme == 'light' ? 'light' : 'dark');
      return;
    } else setTheme(userPrefersDarkMode ? "dark" : "light");
  })

  const setTheme = (theme) => {
    currentTheme = theme;
    document.documentElement.dataset.theme = theme;
    document.cookie = `theme=${theme};max-age=31536000;path="/"`;
  };
</script>

<div class="theme-btn">
  {#if currentTheme === "light"}
    <button class="moon" on:click={() => setTheme("dark")}>
      <Moon />
    </button>
  {:else}
    <button class="sun" on:click={() => setTheme("light")}>
      <Sun />
    </button>
  {/if}
</div>

<style lang="scss">
  .theme-btn {
    position: absolute;
    top: 0.8rem; right: 2.5rem;
    display: inline-block;
    button {
      color: inherit;
      background: transparent;
      outline: none; border: none;
    }
  }
</style>