<script lang="ts">
  export let name = "";
  export let value = "";
  export let disabled = false;
  export let required = false;
  export let placeholder = "0 ether";

  let el : HTMLInputElement;
</script>

<label>
  <slot>Value</slot>
  <input type="text" name={name} bind:this={el} bind:value={value} pattern={"((\\d\\.)?\\d+)?"} disabled={disabled} required={required} placeholder={placeholder} />
  {#if el?.validationMessage}
    {#if el.validity.patternMismatch}
  <span class="invalid">Must be a decimal number</span>
    {:else}
  <span class="invalid">{el.validationMessage}</span>
    {/if}
  {/if}
</label>
