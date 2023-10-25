<script lang="ts">
  import { debouncer } from "$lib/helpers";
  import { createEventDispatcher } from "svelte";

  type Resolver = (addr: string) => Promise<string>;

  export let resolver: Resolver = (_: string) => Promise.resolve("");
  export let disabled = false;
  export let readonly = false;
  export let required = false;
  export let name = "";
  export let resolved = "";
  export let value = resolved;

  export const methods = {
    async resolve(target: any): Promise<string> {
      error = "";
      if (!value) {
        resolved = "";
        return "";
      }
      try {
        loading = true;
        resolved = await resolver(value);
      } catch (err) {
        error = "Failed to resolve";
        throw err;
      } finally {
        loading = false;
      }
      error = "";
      if (was === resolved) return resolved;
      was = resolved;
      dispatch("change", { target, value, resolved });
      return resolved;
    },
  };

  let el: HTMLInputElement;
  let was = "";
  let error = "";
  let loading = false;

  const dispatch = createEventDispatcher();

  async function inputHandler(event: Event) {
    resolved = "";
    const target = event.target as HTMLInputElement;
    if (!target.validity.valid) return;
    return methods.resolve(target);
  }
</script>

<label class:resolved={resolved}>
  <slot>Address</slot>
  <input
    type="text"
    bind:this={el}
    on:input={debouncer(inputHandler)}
    bind:value
    pattern={"(0x[a-fA-F0-9]{40})|((\\w+\\.)+\\w+)"}
    placeholder="Address"
    {name}
    {disabled}
    {readonly}
    {required}
    class:icon-loading={loading}
  />
  {#if resolved}
    <details>
      <summary>{resolved}</summary>
      <!-- TODO: Add details like recent events -->
      <p>Account details and recent history will go here someday, check back later. :)</p>
    </details>
  {/if}
  {#if el?.validationMessage}
    {#if el.validity.patternMismatch}
      <div class="invalid">Must be a valid ENS or hex address</div>
    {:else if el.validity.valueMissing}
    {:else}
      <div class="invalid">{el.validationMessage}</div>
    {/if}
  {/if}
  {#if error}
    <div class="error">{error}</div>
  {/if}
</label>

<style lang="scss">
  :root {
    --resolved-color: rgb(255, 255, 255);
    --resolved-background: rgb(85, 170, 95);
    --resolved-border: 2px solid var(--resolved-background);
  }

  .icon-loading {
    background-position: right 0.5em center;
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
      font-family: monospace;
      background: var(--resolved-background);
      color: var(--resolved-color);
      font-weight: bold;
      line-height: 1.7em;
      padding: 0.5em 0;
      border-radius: 0px 0px 5px 5px;
      border-left: var(--resolved-border);
      border-right: var(--resolved-border);

      p {
        margin: 1em;
      }
    }
  }
</style>
