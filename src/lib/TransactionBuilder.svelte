<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ethers } from "ethers";
  import { autoload } from "@shazow/whatsabi";
  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import Address from '$lib/contract/Address.svelte';
  import Summary from '$lib/contract/Summary.svelte';
  import Value from '$lib/contract/Value.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';

  export let config : Config;
  export let calldata : string;
  export let args : Record<string, string[]>;
  export let value : string;
  export let to : string;
  export let editing : boolean = (to === "");

  let from : string;
  let toResolved : string;
  let toMethods : {
    resolve(target:any): Promise<string>,
  };
  let connectMethods : {
    connect(): Promise<void>;
  };
  let provider : ethers.BrowserProvider;
  let abi : ethers.Interface;
  let functions : ethers.FunctionFragment[];
  let selectedFunction : string;
  let selectedFragment : ethers.FunctionFragment | undefined;
  let submitting = false;
  let result : { status: "error"|"ok", message?:string, value?:any} | null = null;
  let form : HTMLFormElement;

  onMount(() => {
    if (provider) toMethods.resolve("mount");
  });

  const log = {
    error(err: Error|string) {
      const msg = err instanceof Error ? err.message : err;
      result = {
        status: "error",
        message: "Error: "+ msg,
      };
      console.error(err);
    },

    info(...args: any[]) {
      console.log(...args)
    }
  };

  function resolver(value: string): Promise<string> {
    log.info(`Resolving address: ${value}`);
    const r = ethers.resolveAddress(value, provider);
    if (r instanceof Promise) return r;
    return Promise.resolve(r);
  };

  function getArg(index: number) {
    return args[selectedFunction]?.[index] || "";
  }

  async function handleSubmit() {
    log.info("Submitting transaction");

    if (!provider) {
      return log.error("Wallet provider not available");
    }

    if (!toResolved) {
      log.info("Transaction 'to' field is not resolved");
      await toMethods.resolve("submit");
    }

    const tx = {
      from: from,
      to: toResolved,
      data: calldata,
      value: ethers.parseEther(value),
    };

    if (!tx.to) {
      // TODO: We can remove this check once ethers.js v6 bug is fixed?
      return log.error("Failed resolving 'to' address");
    }

    submitting = true;
    try {
      result = {
        status: "ok",
        value: await provider.call(tx),
      }
      log.info("Loaded result", result);
    } catch(err) {
      return log.error(err as Error);
    } finally {
      submitting = false;
    }
  }

  async function loadAddress(event?: CustomEvent) {
    if (!provider) return;
    if (event) toResolved = event.detail.resolved;

    const r = await autoload(to, {
      provider,
      followProxies: true,
      onProgress: (progress, ...args: any[]) => log.info("WhatsABI:", progress, args),
    });

    log.info(`Loaded ABI: ${r.abi?.length} items from ${r.address}`)

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

    log.info(`Connected wallet: ${from}`);
    if (to) toMethods.resolve("connect");
  }

  function updateLink() {
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    let state : Record<string, string|undefined> = {
      data: calldata,
      to: to,
      value: value,
      hint: selectedFragment?.format("sighash"),
    }

    // Clear unset keys
    for (const key of $page.url.searchParams.keys()) {
      if (!state[key]) $page.url.searchParams.delete(key);
    };

    for (const [k, v] of Object.entries(state)) {
      if (!v) {
        continue;
      }
      $page.url.searchParams.set(k, v);
    }

    // TODO: Subscribe to history changes
    window.history.pushState({}, "link", $page.url);
    editing = false;
  }
</script>

<form bind:this={form} on:submit|preventDefault="{handleSubmit}">
  <label>
    <span>From</span>
    <ConnectWallet bind:methods={connectMethods} config={ config } on:connect="{ (e) => connect(e.detail) }" />
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
  <Value bind:value={value} disabled={ !editing }><span>Value</span></Value>
  {/if}

  <Summary to={ toResolved || to } value={value} callSignature={selectedFragment?.format("sighash")} />

  <label>
    <span>Transaction</span>
    {#if editing}
    <button on:click|preventDefault={ updateLink } >💾 Save</button>
    {:else}
    <button on:click|preventDefault={ () => { editing = true }}>⌨ Edit</button>
    {/if}
    {#if !provider}
    <button on:click|preventDefault={ connectMethods.connect } >⛓️ Connect Wallet</button>
    {/if}
    <input type="submit" value="☎️ Execute" disabled={ !provider || toResolved === "" }>
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
</style>
