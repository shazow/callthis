<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import type { ethers } from "ethers";

  import { fromParamType, toValues } from "./param.js";
  import Input from "./Input.svelte";

  export let inputs: readonly ethers.ParamType[];
  export let initialValues: string[] = []; // XXX:

  $: params = inputs.map((t) => fromParamType(t));
  $: values = params.map((p) => toValues(p));

  export let resolver : (addr: string) => Promise<string>;

  const dispatch = createEventDispatcher();

  export let onChange = function(event: Event) {
    const args = values;
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

  const componentArgs = {
    resolver,
    "on:change": onChange,
  };
</script>

{#if params.length > 0}
  {#each params as p}
    <Input input={ p } componentArgs={ componentArgs } />
  {/each}
{/if}
