<script lang="ts">
  import Moon from './icons/moon.svelte';
  import Sun from './icons/sun.svelte';

  let currentTheme = "light";

  const setTheme = (theme) => {
    currentTheme = theme;
    document.documentElement.setAttribute("data-theme", theme);
  };
</script>

<div class="theme-btn">
  {#if currentTheme === "light"}
    <span class="moon" on:click={() => setTheme("dark")}>
      <Moon />
    </span>
  {:else}
    <span class="sun" on:click={() => setTheme("light")}>
      <Sun />
    </span>
  {/if}
</div>

<style lang="scss">
  .theme-btn {
    position: absolute;
    top: 1.2rem; right: 2.5rem;
    display: inline-block;
  }
</style>