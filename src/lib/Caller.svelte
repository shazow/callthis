<script lang="ts">
  //import { ethers } from "ethers";
  import type { ethers } from "ethers";

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
</script>

<form on:submit|preventDefault="{handleSubmit}">
  <label>
    <span>From</span>
    <input type="text" name="from" bind:value={from} readonly disabled />
  </label>

  <label>
    <span>Address</span>
    <input type="text" name="address" bind:value={address} required pattern="(0x[a-fA-F0-9]{40})|(\w+\.\w+)" />
  </label>

  <label>
    <span>Calldata</span>
    <textarea name="calldata" bind:value={calldata} placeholder="0x" disabled />
  </label>

  <label>
    <slot name="connect">Connect Wallet</slot>
  </label>

  <label>
    <input type="submit" value="Execute Transaction" disabled="{ !provider }">
  </label>
</form>

<style lang="scss">
  form {
    width: 30rem;
  }
</style>
