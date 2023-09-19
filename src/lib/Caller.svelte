<script lang="ts">
  import { ethers } from "ethers";
  import { autoload } from "@shazow/whatsabi";
  import { debouncer } from "$lib/helpers";
  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';

  let from : string;
  let provider : ethers.BrowserProvider;

  export let config : Config;
  export let calldata : string;
  export let address : string;

  function handleSubmit() {
    if (!provider) return;

    const tx = {
      from: from,
      to: address,
      data: calldata,
    };

    provider.call(tx);
  }

  async function loadAddress() {
    const abi = await autoload(address, {
      provider,
      followProxies: true,
      onProgress: (progress, ...args: any[]) => console.debug("WhatsABI: ", progress, args),
    });
    console.log("Loaded ABI: ", abi);
  }

  async function connect(wallet: { provider: any, accounts: string[] }) {
    provider = new ethers.BrowserProvider(wallet.provider);
    from = wallet.accounts[0];

    loadAddress();
  }

  async function handleAddress(event: Event) {
    const target = event.target as HTMLSelectElement;
    if (!target.validity.valid) return;
    if (!provider) return;

    return loadAddress();
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

  <p>
    <ConnectWallet config={ config } on:connect="{ (e) => connect(e.detail) }" />
  </p>

  <label>
    <input type="submit" value="Execute Transaction" disabled={ !provider }>
  </label>
</form>

<style lang="scss">
  form {
    width: 30rem;
  }
</style>
