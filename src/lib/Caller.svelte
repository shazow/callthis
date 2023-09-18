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
    <span>Address</span>
    <input type="text" name="address" bind:value={address} readonly />
  </label>

  <label>
    <span>Calldata</span>
    <input type="text" name="calldata" bind:value={calldata} readonly />
  </label>

  <label>
    <span></span>
    <input type="submit" value="Execute Transaction" disabled="{ !provider }">
    <slot name="connect">Connect Wallet</slot>
  </label>
</form>

<style lang="scss">
  label {
    display: flex;
    margin-bottom: 1rem;
    align-items: center;

    span {
      display: inline-block;
      min-width: 10rem;
      text-align: right;
      margin-right: 1rem;
    }
  }

  input {
    min-width: 12rem;
    padding: 0.5rem 0.8rem;
    border-radius: 5px;
    border: 2px solid rgba(0, 0, 0, 0.2);
    margin-right: 1rem;
  }
</style>
