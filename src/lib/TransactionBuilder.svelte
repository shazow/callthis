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
  let editing : boolean;
  let result : { status: "error"|"ok", message?:string, value?:any} | null = null;

  editing = (to === "");

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

    try {
      result = {
        status: "ok",
        value: await provider.call(tx),
      }
      console.log("Loaded result:", result);
    } catch (e) {
      result = {
        status: "error",
        message: "Error: "+ (e as Error).message,
      };
    }
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

  {#if calldata || editing}
  <label>
    <span>Calldata</span>
    <textarea name="calldata" bind:value={calldata} placeholder="0x" disabled />
  </label>
  {/if}

  {#if value || editing}
  <label>
    <span>Value</span>
    <input type="text" name="value" bind:value={value} placeholder="0" disabled={ !editing }/>
  </label>
  {/if}

  <!-- TODO: Move to a TransactionSummary component -->
  <quote>
    {#if selectedFragment}
    Call <code>{selectedFragment.format("sighash")}</code>
      {#if toResolved}
      on contract at <code>{toResolved}</code>
      {:else if to}
      on contract at <code>{to}</code>
      {:else}
      ...
      {/if}
      {#if value}
      with <code>{value} ether</code>
      {/if}
    {:else if value}
    Send <code>{value} ether</code>
      {#if toResolved}
      to <code>{toResolved}</code>
      {:else if to}
      to <code>{to}</code>
      {:else}
      ...
      {/if}
    {:else if to}
    Call contract at
      {#if toResolved}
      <code>{toResolved}</code>
      {:else}
      <code>{to}</code>
      {/if}
      without any data
    {/if}
  </quote>

  <label>
    <span>Transaction</span>
    {#if editing}
    <button on:click|preventDefault={ () => { editing = false }}>Update Link</button>
    {:else}
    <button on:click|preventDefault={ () => { editing = true }}>Edit Transaction</button>
    {/if}
    <input type="submit" value="Simulate & Execute" disabled={ !provider || toResolved === "" }>
  </label>

  {#if result}
  <label>
    <span>Result</span>
    <div class="result {result.status}">
      {result.value || result.message}
    </div>
  </label>
  {/if}

</form>

<style lang="scss">
  form {
    max-width: 30rem;
  }

  label.input {
    padding-left: 1rem;
    border-left: 0.5rem solid rgba(35,80,180,0.3);
  }

  .result {
    width: 100%;
    border-radius: 5px;
    color: rgba(255, 255, 255, 0.9);
    font-family: monospace;
    font-weight: bold;
    padding: 0.5rem 0.5rem;

    &.ok {
      word-break: break-all;
      background: rgba(85, 170, 95);
      font-size: 1.2rem;
    }
    &.error {
      background: rgba(170, 85, 95);
    }
  }

  quote {
    color: rgba(0, 0, 0, 0.8);
    display: block;
    border-left: 5px solid rgba(255, 160, 70, 0.8);
    border-radius: 5px;
    background: rgba(255, 160, 70, 0.1);
    padding: 0.3em 0.5em;
    line-height: 1.7em;
    font-size: 1rem;
    font-weight: bold;
    margin-bottom: 1em;

    code {
      background: rgba(255, 210, 70, 0.6);
      font-weight: bold;
      padding: 0.1em 0.3em;
      color: rgba(105, 95, 25, 0.8);
      border-radius: 3px;
    }
  }
</style>
