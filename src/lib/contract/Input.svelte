<script lang="ts">
  import type { Param } from "./param.js";
  import Address from "./Address.svelte";

  export let input : Param;

  export let componentArgs: any = {};
</script>

<section class="input">
  {#if input.children }
    {#each input.children as p}
      <svelte:self input={ p } componentArgs={ componentArgs } />
    {/each}
    {#if input.childrenExtendType}
      <button>+</button>
    {/if}
  {:else if input.type.baseType === "address"}
    <Address required bind:value={ input.value } bind:resolved={ input.resolved } {...componentArgs}><span>{input.type.name}</span></Address>
  {:else}
    <span class="input-name">{input.type.name}</span>
    <input type="text" required bind:value={ input.value } {...componentArgs} />
    <aside>{input.type}</aside>
  {/if}
</section>
