<script lang="ts">
  import type { Param } from "./param.js";
  import { extendArray, shrinkArray } from "./param.js";
  import Address from "./Address.svelte";

  export let input : Param;

  export let componentArgs: any = {};

</script>

{#if input.children }
<details open class="input">
  <summary><span class="type">{input.type.name} {input.type.baseType}</span></summary>
  {#each input.children as p}
    <svelte:self input={ p } componentArgs={ componentArgs } />
  {/each}

  {#if input.childrenExtendType}
    <p class="type">{input.childrenExtendType.type.format("full")}</p>
    <button on:click|preventDefault={ () => { input = extendArray(input) } }>+</button>
    <button on:click|preventDefault={ () => { input = shrinkArray(input) } } disabled={ !input.children.length }>-</button>
  {/if}
</details>

{:else if input.type.baseType === "address"}
  <Address required bind:value={ input.value } bind:resolved={ input.resolved } resolver={ componentArgs.resolver } on:change={ componentArgs.onChange }><span>{input.type.name}</span></Address>

{:else}
  <label>
    <span>{input.type.name}</span>
    <aside class="type">{input.type.baseType}</aside>
    <input type="text" required on:change={ componentArgs.onChange } bind:value={ input.value } /> </label>
{/if}

<style lang="scss">
button {
  width: initial;
}
</style>
