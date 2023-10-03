<script lang="ts">
  import { page } from '$app/stores';
  import { ethers } from "ethers";
  import { autoload } from "@shazow/whatsabi";
  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import Address from '$lib/contract/Address.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';

  export let config : Config;
  export let calldata : string;
  export let args : Record<string, string[]>;
  export let value : string;
  export let to : string;

  let from : string;
  let toResolved : string;
  let toMethods : {
    resolve(target:any): Promise<string>,
  };
  let provider : ethers.BrowserProvider;
  let abi : ethers.Interface;
  let functions : ethers.FunctionFragment[];
  let selectedFunction : string;
  let selectedFragment : ethers.FunctionFragment | undefined;
  let editing = to === "";
  let result : { status: "error"|"success", message:string} | null = null;

  function resolver(value: string): Promise<string> {
    const r = ethers.resolveAddress(value, provider);
    if (r instanceof Promise) return r;
    return Promise.resolve(r);
  };

  function getArg(index: number) {
    return args[selectedFunction]?.[index] || "";
  }

  async function handleSubmit() {
    if (!provider) return;

    const tx = {
      from: from,
      to: toResolved,
      data: calldata,
    };

    if (!tx.to) throw new Error("Missing resolved target address");

    console.log(await provider.estimateGas(tx));
  }

  async function loadAddress(event?: CustomEvent) {
    if (!provider) return;
    if (event) toResolved = event.detail.resolved;

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

    toMethods.resolve("connect");
  }

  function updateLink() {
    let state : Record<string, string|undefined> = {
      data: calldata,
      to: to,
      value: value,
      hint: selectedFragment?.format("sighash"),
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

  <Address required disabled={ !editing } bind:methods={ toMethods } resolver={ resolver } bind:value={ to } on:change={ loadAddress }><span>To</span></Address>

  {#if functions}
  <label>
    <span>Function</span>
    <select bind:value={ selectedFunction } on:change={ updateFunction } disabled={ !editing }>
      <option></option>
      {#each functions as f}
      <option value={f.selector}>{f.format("full").slice("function ".length)}</option>
      {/each}
    </select>
  </label>
  {/if}

  {#if selectedFragment}
  {#each selectedFragment.inputs as input, i}
  <label class="input">
    {#if input.baseType === "tuple" || input.baseType === "array" }
    <input type="text" placeholder="Unsupported type: {input.type}" disabled />
    {:else}
    <span>{input.name}</span>
    <input type="text" value="{getArg(i)}" />
    <aside>{input.type}</aside>
    {/if}
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
    <button on:click={ updateLink } disabled={!editing} >Update Link</button>
    <input type="submit" value="Simulate & Execute" disabled={ !provider }>
  </label>
</form>

{#if result}
<div class="result">
${result.message}
</div>
{/if}

<style lang="scss">
  form {
    max-width: 30rem;
  }

  label.input {
    padding-left: 1rem;
    border-left: 0.5rem solid rgba(35,80,180,0.3);
  }

  .result {
    font-family: monospace;
  }
</style>
