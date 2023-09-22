<script lang="ts">
  import { page } from '$app/stores';
  import { ethers } from "ethers";
  import { autoload } from "@shazow/whatsabi";
  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import Address from '$lib/contract/Address.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';

  let from : string;
  let provider : ethers.BrowserProvider;
  let abi : ethers.Interface;
  let functions : ethers.FunctionFragment[];
  let selectedFunction : string;
  let selectedFragment : ethers.FunctionFragment | undefined;
  let editing = false;

  export let config : Config;
  export let calldata : string;
  export let args : Record<string, string[]>;
  export let value : string;
  export let to : string;

  function getArg(index: number) {
    return args[selectedFunction]?.[index] || "";
  }

  function handleSubmit() {
    if (!provider) return;

    const tx = {
      from: from,
      to: to,
      data: calldata,
    };

    provider.call(tx);
  }

  async function loadAddress() {
    if (!provider) return;

    const r = await autoload(to, {
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

  function updateLink() {
    let state : Record<string, string|undefined> = {
      data: calldata,
      to: to,
      value: value,
      hint: selectedFragment?.format("minimal"),
    }

    console.log("Updating state:", state);

    for (const [k, v] of Object.entries(state)) {
      if (!v) {
        $page.url.searchParams.delete(k);
        continue;
      }
      $page.url.searchParams.set(k, v);
    }

    // TODO: Subscribe to history changes
    window.history.pushState({}, "link", $page.url);
    editing = false;
  }
</script>

<form on:submit|preventDefault="{handleSubmit}">
  <label>
    <span>From</span>
    <ConnectWallet config={ config } on:connect="{ (e) => connect(e.detail) }" />
  </label>

  <Address required disabled={ !editing } provider={ provider } bind:value={ to } on:change={ loadAddress }><span>To</span></Address>

  {#if functions}
  <label>
    <span>Function</span>
    <select bind:value={ selectedFunction } on:change={ updateFunction }>
      <option></option>
      {#each functions as f}
      <option value={f.selector}>{f.format("full").slice("function ".length)}</option>
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

  {#if value || editing}
  <label>
    <span>Value</span>
    <input type="text" name="value" bind:value={value} placeholder="0" />
  </label>
  {/if}

  <label>
    <span>Transaction</span>
    <button on:click={ () => editing = true } disabled={editing}>Edit Transaction</button>
    <button on:click={ updateLink }>Update Link</button>
    <input type="submit" value="Simulate & Execute" disabled={ !provider }>
  </label>
</form>

<style lang="scss">
  form {
    max-width: 30rem;
  }
</style>
