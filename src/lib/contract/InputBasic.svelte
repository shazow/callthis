<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  type Validator = (v: string) => string;
  export let validate : Validator | undefined = undefined;

  export let name = "";
  export let value = "";
  export let placeholder = "";

  export let onChange = function (event: Event) {
    if (!validate) return;
    const err = validate(value);
    el.setCustomValidity(err);
    if (!err) dispatch("change", { value, target: el });
    el = el;
  };

  let el: HTMLInputElement;
</script>

<label>
  <slot />
  <input
    type="text"
    required
    {name}
    {placeholder}
    bind:value
    bind:this={el}
    on:change={onChange}
  />
  {#if el?.validationMessage && el.validity.customError}
    <div class="invalid">{el.validationMessage}</div>
  {/if}
</label>
