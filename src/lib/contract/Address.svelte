<script lang="ts">
  import { ethers } from "ethers";
  import { debouncer } from "$lib/helpers";
  import { createEventDispatcher } from 'svelte';

  export let provider : ethers.BrowserProvider;

  export let disabled = false;
  export let readonly = false;
  export let required = false;
  export let value = "";
  export let resolved = "";

  const dispatch = createEventDispatcher();

  async function inputHandler(event: Event) {
    resolved = "";
    const target = event.target as HTMLInputElement;
    if (!target.validity.valid) return;

    if (provider) {
      resolved = await ethers.resolveAddress(value, provider);
    }

    dispatch("change", {target, value, resolved});
  }
</script>

  
<label class:resolved={ resolved && resolved != value }>
  <slot>Address</slot>
  <input type="text" on:input={debouncer(inputHandler)} bind:value={value} pattern="(0x[a-fA-F0-9]{40})|((\w+\.)+\w+)" disabled={disabled} readonly={readonly} required={required}/>
  {#if resolved && resolved != value}
  <aside>
    {resolved}
  </aside>
  {/if}
</label>

<style lang="scss">
  :root {
    --resolved-color: rgb(255, 255, 255);
    --resolved-background: rgb(85, 170, 95);
    --resolved-border: 2px solid var(--resolved-background);
  }

  input {
    font-size: 1em;
    font-family: monospace;
    width: 100%;
    line-height: 1.5em;
  }
  .resolved {
    input {
      margin-bottom: 0;
      border-radius: 5px 5px 0 0;
      border-bottom: 0;
    }

    aside {
      box-sizing: border-box;
      font-size: 1em;
      width: 100%;
      font-family: monospace;
      background: var(--resolved-background);
      color: var(--resolved-color);
      font-weight: bold;
      line-height: 1.5em;
      padding: 0.5em 1em;
      border-radius: 0px 0px 5px 5px;
      border-left: var(--resolved-border);
      border-right: var(--resolved-border);
    }
  }
</style>
