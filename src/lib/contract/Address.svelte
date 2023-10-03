<script lang="ts">
  import { debouncer } from "$lib/helpers";
  import { createEventDispatcher } from 'svelte';

  //$$restProps; // Workaround for https://github.com/sveltejs/svelte/issues/4652

  type Resolver = (addr: string) => Promise<string>;

  export let resolver : Resolver = (_: string) => Promise.resolve("");
  export let disabled = false;
  export let readonly = false;
  export let required = false;
  export let value = "";
  export let resolved = "";
  export const methods = {
    async resolve(target:any): Promise<string> {
      resolved = await resolver(value);
      if (was === resolved) return resolved;
      was = resolved;
      dispatch("change", {target, value, resolved});
      return resolved;
    },
  }

  let was = "";

  const dispatch = createEventDispatcher();

  async function inputHandler(event: Event) {
    resolved = "";
    const target = event.target as HTMLInputElement;
    if (!target.validity.valid) return;
    return methods.resolve(target);
  }
</script>

<label class:resolved={ resolved && resolved != value }>
  <slot>Address</slot>
  <input type="text" on:input={debouncer(inputHandler)} bind:value={value} pattern={"(0x[a-fA-F0-9]{40})|((\\w+\\.)+\\w+)"} disabled={disabled} readonly={readonly} required={required}/>
  {#if resolved && resolved != value}
  <details>
    <summary>{resolved}</summary>
    <!-- TODO: Add details like recent events -->
  </details>
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

    details {
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
