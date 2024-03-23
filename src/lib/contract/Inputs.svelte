<script lang="ts">
import { createEventDispatcher } from "svelte";

import type { ethers } from "ethers";

import Address from "./Address.svelte";

export let inputs : ethers.ParamType[];
export let values : any[] = [];
export let resolved : any[] = [];
export let resolver : (addr: string) => Promise<string>;

const dispatch = createEventDispatcher();

export let onChange = function(event: Event) {
  const args = values.map((v, i) => {
    return resolved[i] || v;
  });
  const target = event.target as HTMLInputElement;
  try {
    target.setCustomValidity("");
    dispatch("change", {values, resolved: args});
  } catch (err: any) {
    const msg = err.message;
    console.error("Field encoding error: " + msg);
    target.setCustomValidity(msg);
  }
}

// TODO: Need to construct a separate datastructure that maintains { value,
// type } pairs, so that dynamically sized arrays can be added independently of
// mutating the ParamType tree.

</script>

{#if inputs && inputs.length > 0}
<div class="inputs">
  {#each inputs as input, i}
  <section class="input">
    {#if input.baseType === "tuple" }
    <!-- <svelte:self onChange={ onChange } resolver={ resolver } bind:values={ values[i] } bind:resolved={ resolved[i] } inputs={ input.components } /> -->
    <input type="text" placeholder="Unsupported type: {input.type}" disabled />
    {:else if input.baseType === "array" }
    <!-- <svelte:self onChange={ onChange } resolver={ resolver } bind:values={ values[i] } bind:resolved={ resolved[i] } inputs={ input.arrayChildren.components } /> -->
    <input type="text" placeholder="Unsupported type: {input.type}" disabled />
    {:else if input.baseType === "address"}
    <Address required resolver={ resolver } bind:value={ values[i] } bind:resolved={ resolved[i] } on:change={ onChange }><span>{input.name}</span></Address>
    {:else}
    <span class="input-name">{input.name}</span>
    <input type="text" bind:value={values[i]} required on:change={ onChange } />
    <aside>{input.type}</aside>
    {/if}
  </section>
  {/each}
</div>
{/if}
