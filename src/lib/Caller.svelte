<script lang="ts">
  //import { ethers } from "ethers";
  import type { ethers } from "ethers";
  import { autoload } from "@shazow/whatsabi";
  import { debouncer } from "$lib/helpers";

  export let provider : ethers.BrowserProvider;

  export let from : string;
  export let calldata : string;
  export let address : string;

  function handleSubmit() {
    const tx = {
      from: from,
      to: address,
      data: calldata,
    };

    provider.call(tx);
  }

  async function handleAddress(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (!target.validity.valid) return;

    console.log("Loading ABI for: ", address);
    const abi = await autoload(address, { provider });
    console.log("Loaded ABI: ", abi);
  }
</script>

<form on:submit|preventDefault="{handleSubmit}">
  <label>
    <span>From</span>
    <input type="text" name="from" bind:value={from} readonly disabled />
  </label>

  <label>
    <span>Address</span>
    <input type="text" name="address" on:input={debouncer(handleAddress)} bind:value={address} required pattern="(0x[a-fA-F0-9]{40})|((\w+\.)+\w+)" />
  </label>

  <label>
    <span>Calldata</span>
    <textarea name="calldata" bind:value={calldata} placeholder="0x" disabled />
  </label>

  <label>
    <slot name="connect">Connect Wallet</slot>
  </label>

  <label>
    <input type="submit" value="Execute Transaction" disabled={ !provider }>
  </label>
</form>

<style lang="scss">
  form {
    width: 30rem;
  }
</style>
