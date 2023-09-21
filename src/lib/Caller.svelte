<script lang="ts">
  import { ethers } from "ethers";
  import { autoload } from "@shazow/whatsabi";
  import { debouncer } from "$lib/helpers";
  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';

  let from : string;
  let provider : ethers.BrowserProvider;
  let abi : ethers.Interface;
  let functions : ethers.FunctionFragment[];
  let selectedFunction : string;
  let selectedFragment : ethers.FunctionFragment | undefined;

  export let config : Config;
  export let calldata : string;
  export let args : Record<string, string[]>;
  export let value : string;
  export let address : string;

  function getArg(index: number) {
    return args[selectedFunction]?.[index] || "";
  }

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
    const r = await autoload(address, {
      provider,
      followProxies: true,
      onProgress: (progress, ...args: any[]) => console.log("WhatsABI: ", progress, args),
    });
    console.log("Loaded ABI: ", r);

    selectedFunction = calldata.slice(0, 10);
    abi = ethers.Interface.from(r.abi);
    functions = [];
    abi.forEachFunction(f => functions.push(f));
    updateFunction();
  }

  function updateFunction() {
    calldata = selectedFunction;
    selectedFragment = functions.find(f => f.selector === selectedFunction);
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

  {#if functions}
  <label>
    <span>Function</span>
    <select bind:value={ selectedFunction } on:change={ updateFunction }>
      <option></option>
      {#each functions as f}
      <option value={f.selector}>{f.format("full")}</option>
      {/each}
    </select>
  </label>
  {/if}

  {#if selectedFragment}
  {#each selectedFragment.inputs as input, i}
  <label>
    <span>{input.name}</span>
    <input type="text" value="{getArg(i)}" /> as {input.type}
  </label>
  {/each}
  {/if}

  <label>
    <span>Calldata</span>
    <textarea name="calldata" bind:value={calldata} placeholder="0x" disabled />
  </label>

  <label>
    <span>Value</span>
    <input type="text" name="value" bind:value={value} placeholder="0" />
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
