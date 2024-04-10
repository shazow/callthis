<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  type Validator = (v: string) => string;
  export let validate : Validator | undefined = undefined;

  export let name = "";
  export let value = "";
  export let bytes : number = 0;
  // export let placeholder = "0x" + "0".repeat(bytes * 2);
  export let placeholder = "0x...";

  $: pattern = "0x[a-fA-F0-9]*";
  $: maxlength = (bytes > 0) ? 2 + bytes * 2 : undefined; // 0x...
  $: minlength = maxlength || 2; // 0x...

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
    {pattern}
    {maxlength}
    {minlength}
    bind:value
    bind:this={el}
    on:change={onChange}
  />
  {#if el?.validationMessage && el.validity.customError}
    <div class="invalid">{el.validationMessage}</div>
  {/if}
</label>
