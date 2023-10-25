<script lang="ts">
import { createEventDispatcher } from "svelte";

import type { ethers } from "ethers";

import Address from "./Address.svelte";

export let abi : ethers.Interface;
export let fragment : ethers.FunctionFragment;
export let values : any[] = [];
export let resolved : any[] = [];
export let resolver : (addr: string) => Promise<string>;


const dispatch = createEventDispatcher();

function onChange() {
  const args = values.map((v, i) => {
    return resolved[i] || v;
  });
  const calldata = abi.encodeFunctionData(fragment, args);
  dispatch("change", {calldata, values, resolved: args});
}
</script>

<div class="inputs">
  {#each fragment?.inputs as input, i}
  <section class="input">
    {#if input.baseType === "tuple" || input.baseType === "array" }
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
