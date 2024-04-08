<script lang="ts">
  import { createEventDispatcher } from "svelte";

  import type { ethers } from "ethers";

  import { fromParamType, toValues, setValues } from "./param.js";
  import Input from "./Input.svelte";

  export let inputs: readonly ethers.ParamType[];
  export let initialValues: string[] = [];

  $: params = inputs.map((t: ethers.ParamType, idx: number) => {
    const p = fromParamType(t)
    const v = initialValues[idx];
    if (v) setValues(p, v);
    return p;
  });

  export let resolver : (addr: string) => Promise<string>;

  const dispatch = createEventDispatcher();

  export let onChange = function(event: Event) {
    const args = params.map((p) => toValues(p));
    const target : HTMLInputElement = event.target || (event as CustomEvent).detail.target;
    try {
      target.setCustomValidity("");
      dispatch("change", {args, resolved: args});
    } catch (err: any) {
      const msg = err.message;
      console.error("Field encoding error: " + msg);
      target.setCustomValidity(msg);
    }
  }

  const componentArgs = {
    resolver,
    onChange,
  };
</script>

{#if params.length > 0}
  {#each params as p}
    <Input input={ p } componentArgs={ componentArgs } />
  {/each}
{/if}
