<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { ethers } from "ethers";
  import { whatsabi, loaders } from "@shazow/whatsabi";
  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import Address from '$lib/contract/Address.svelte';
  import Summary from '$lib/contract/Summary.svelte';
  import Value from '$lib/contract/Value.svelte';
  import Inputs from '$lib/contract/Inputs.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';

  type PreparedTransaction = {
    from: string,
    to: string,
    data: string | null,
    value: bigint | null,
  }

  export let config : Config;
  export let calldata : string;
  export let args : Record<string, string[]>;
  export let value : string;
  export let to : string;
  export let editing : boolean = (to === "");
  export let hint : string;

  let from : string;
  let toResolved : string;
  let toMethods : {
    resolve(target:any): Promise<string>,
  };
  let connectMethods : {
    connect(): Promise<void>;
    disconnect: null|(() => void),
  };
  const defaultProvider = ethers.getDefaultProvider("homestead");
  let provider : ethers.Provider = defaultProvider;
  let signer : ethers.Signer | undefined = undefined;
  let abi : ethers.Interface;
  let functions : ethers.FunctionFragment[];
  let functionsFor : string;
  let selectedFunction : string;
  let selectedFragment : ethers.FunctionFragment | undefined;
  let result : { status: "error"|"ok", message?:string, value?:any} | null = null;
  let receipt : ethers.TransactionReceipt | null;
  let form : HTMLFormElement;
  let functionArgs : Array<string>;
  let preparedTx : PreparedTransaction | null = null;
  let network : {
    chainId: bigint,
    name: string,
  };
  let loading : Record<string, boolean> = {};

  const abiLoader = new loaders.MultiABILoader([
    new loaders.SourcifyABILoader(),
    new loaders.EtherscanABILoader({
      // TODO: Move to config container
      apiKey: "SHT8M9JSGR62U5U7YVFUSTPG41IVR1F7ND",
    }),
  ]);

  onMount(async () => {
    // Load hint?
    if (calldata.length >= 10 && hint) {
      const maybeABI = ethers.Interface.from(["function " + hint]);
      const fn = maybeABI.getFunction(calldata.slice(0, 10));
      if (!fn) return;
   
      selectedFunction = fn.selector;
      abi = maybeABI;
      functions = [fn];
      updateFunction();
      log.info('Loaded partial ABI from hint');
    }

    if (provider) await toMethods.resolve("mount");
    else if (to) await loadAddress();
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

  async function handleSubmit() {
    if (loading.submit) {
      log.info("Already submitting, ignored new submit");
      return;
    }
    preparedTx = null;
    log.info("Submitting preview transaction", { from, toResolved, calldata, value });

    if (!provider) {
      return log.error("Ethereum provider not available");
    }

    if (!toResolved) {
      log.info("Transaction 'to' field is not resolved");
      await toMethods.resolve("submit");
    }

    const tx : PreparedTransaction = {
      from: from,
      to: toResolved,
      data: null,
      value: null,
    };
    if (calldata) tx.data = calldata;
    if (value) tx.value = ethers.parseEther(value);

    if (!tx.to) {
      // TODO: We can remove this check once ethers.js v6 bug is fixed?
      return log.error("Failed resolving 'to' address");
    }

    loading.submit = true;
    try {
      let r = await provider.call(tx);
      if (selectedFragment && selectedFragment.outputs?.length > 0) {
        // TODO: Use this function once its implemented: abi.parseCallResult(r)
        const res = abi.decodeFunctionResult(selectedFragment, r);
        r = res.toString();
      }
      result = {
        status: "ok",
        value: r,
      }
      log.info("Loaded result", result);
    } catch(err) {
      return log.error(err as Error);
    } finally {
      loading.submit = false;
      const mutability = selectedFragment?.stateMutability;
      if (mutability !== "view" && mutability != "pure") {
        preparedTx = tx;
      } else {
        log.info(`Function is not mutable: ${mutability}`)
      }
    }
  }

  async function submitTransaction() {
    if (loading.submit) {
      log.info("Already submitting, ignored new submit");
      return;
    }
    if (!preparedTx) {
      return log.error("Missing prepared transaction, do a call on a mutable function");
    }
    if (!signer) {
      return log.error("Missing signer");
    } 
    log.info("Signing transaction", preparedTx);

    loading.submit = true;
    try {
      let r = await signer.sendTransaction(preparedTx);
      log.info("Waiting for transaction: ", r.hash);
      receipt = await r.wait();
    } finally {
      loading.submit = false;
    }
  }

  async function loadAddress(event?: CustomEvent) {
    if (!provider) {
      return;
    }
    if (event) toResolved = event.detail.resolved;
    if (functionsFor != to) functions = [];

    let r;
    loading.to = true;
    try {
      r = await whatsabi.autoload(to, {
        provider,
        abiLoader,
        followProxies: true,
        onProgress: (progress, ...args: any[]) => log.info("WhatsABI:", progress, args),
      });
    } finally {
      loading.to = false;
    }

    log.info(`Loaded ABI: ${r.abi?.length} items from ${r.address}`)

    selectedFunction = calldata.slice(0, 10);
    if (functions.length === 0 || r.abi.length > 0) {
      abi = ethers.Interface.from(r.abi);
      functions = [];
      abi.forEachFunction(f => functions.push(f));
    }
    updateFunction();
  }

  function updateFunction() {
    functionsFor = to;

    if (calldata.slice(0, 10) !== selectedFunction) {
      calldata = selectedFunction
    }
    selectedFragment = functions.find(f => f.selector === selectedFunction);
    functionArgs = args[selectedFunction] || [];

    if (calldata.length > 10 && selectedFragment) {
      // Calldata has args that we can parse
      functionArgs = abi.decodeFunctionData(selectedFragment, calldata);
    }
  }

  async function connect(wallet: { provider: any, accounts: string[] }) {
    const browserProvider = new ethers.BrowserProvider(wallet.provider);
    provider = browserProvider;
    signer = await browserProvider.getSigner();
    from = wallet.accounts[0];
    network = await provider.getNetwork();
    log.info(`Connected wallet: ${from}`);
    if (to) toMethods.resolve("connect");
  }

  async function disconnect() {
    log.info("Wallet disconnected");
    provider = defaultProvider;
    signer = undefined;
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

  function onInputsChanged(event: CustomEvent) {
    const context = event.detail as { calldata: string, values: string[], resolved: string[] };
    calldata = context.calldata;
    functionArgs = context.values;
  }

  type FunctionsByStateMutability = Record<"payable"|"nonpayable"|"readonly"|"unknown",ethers.FunctionFragment[]>;

  function splitMutability(fns:ethers.FunctionFragment[]): FunctionsByStateMutability {
    const r : FunctionsByStateMutability = {
      payable: [],
      nonpayable: [],
      readonly: [],
      unknown: [],
    };
    if (!fns) return r;
    for (const f of fns) {
      if (f.stateMutability === "payable") r.payable.push(f);
      else if (f.stateMutability === "nonpayable") r.nonpayable.push(f);
      else if (f.stateMutability) r.readonly.push(f);
      else r.unknown.push(f);
    }
    // Detect whatsabi failing to detect
    if (!r.payable.length && !r.readonly.length && !r.unknown.length && r.nonpayable.length) {
      r.unknown = r.nonpayable;
      r.nonpayable = [];
    }
    return r;
  }

  $: splitFunctions = splitMutability(functions);

</script>

<form bind:this={form} on:submit|preventDefault="{handleSubmit}" class="builder">
  <section>
    <h2>From</h2>
    <ConnectWallet bind:methods={connectMethods} config={ config } on:connect={ (e) => connect(e.detail) } on:disconnect={ disconnect }>
      <svelte:fragment slot="connected-label">{ network?.name || "Connected" }</svelte:fragment>
    </ConnectWallet>
  </section>

  <section>
    <Address required disabled={ !editing } bind:methods={ toMethods } resolver={ resolver } bind:value={ to } on:change={ loadAddress }><h2>To</h2></Address>
  </section>

  {#if loading.to}
  <section class="loading icon-loading">
  Checking if address is a contract and loading the interface...
  </section>
  {/if}

  {#if functions?.length > 0 && (editing || selectedFunction)}
  <section>
    <label>
      <h2>Function</h2>
      <select bind:value={ selectedFunction } on:change={ updateFunction } disabled={ !editing }>
        <option></option>
        {#each splitFunctions.unknown as f}
        <option value={f.selector}>{f.format("full").slice("function ".length)}</option>
        {/each}
        {#if splitFunctions.payable.length}
        <optgroup label="Payable">
          {#each splitFunctions.payable as f}
          <option value={f.selector}>{f.format("full").slice("function ".length)}</option>
          {/each}
        </optgroup>
        {/if}
        {#if splitFunctions.nonpayable.length}
        <optgroup label="Writeable">
          {#each splitFunctions.nonpayable as f}
          <option value={f.selector}>{f.format("full").slice("function ".length)}</option>
          {/each}
        </optgroup>
        {/if}
        {#if splitFunctions.readonly.length}
        <optgroup label="Readable">
          {#each splitFunctions.readonly as f}
          <option value={f.selector}>{f.format("full").slice("function ".length)}</option>
          {/each}
        </optgroup>
        {/if}
      </select>
    </label>
  </section>
  {/if}

  {#if selectedFragment}
  <Inputs abi={abi} fragment={selectedFragment} values={functionArgs} resolver={resolver} on:change={ onInputsChanged } />
  {/if}

  {#if calldata || editing}
  <section>
    <label>
      <h2>Calldata</h2>
      <textarea name="calldata" bind:value={calldata} placeholder="0x" disabled />
    </label>
  </section>
  {/if}

  {#if value || editing}
  <section>
    <Value bind:value={value} disabled={ !editing }><h2>Value</h2></Value>
  </section>
  {/if}

  <section>
    <Summary to={ toResolved || to } value={value} callSignature={selectedFragment?.format("sighash")} />
  </section>

  <section>
    <h2>Transaction</h2>
    {#if editing}
    <button class="icon-save" on:click|preventDefault={ updateLink }>Save Link</button>
    {:else}
    <button class="icon-edit" on:click|preventDefault={ () => { editing = true }}>Edit</button>
    {/if}
    <input type="submit" class="icon-call" value="Preview Call" disabled={ !provider || !to || loading.submit }>
  </section>

  {#if result}
  <section>
    <label for={undefined}>
      <h2>Result</h2>
      <div class="result {result.status}">
        {result.value || result.message || "✔️"}
      </div>
    </label>
  </section>
  {/if}

  {#if preparedTx}
  <section>
    <h2>Execute On-chain</h2>
    {#if !signer}
    <button class="icon-connect" on:click|preventDefault={ connectMethods.connect } >Connect Wallet</button>
    {/if}
    <button on:click|preventDefault={ submitTransaction } disabled={ !signer || loading.submit }>🚀 Submit Transaction</button>
    {#if signer}
    <p class="warning">Please confirm details in your wallet before accepting</p>
    {/if}
  </section>
  {/if}

</form>

{#if !to}
<section class="example">
  <p>
    <strong>Example:</strong> <a href="/?to=callthis.eth&value=0.1">Send 0.1 ETH to callthis.eth</a> 🥹
  </p>
</section>
{/if}

<style lang="scss">
  .loading {
    padding-left: 2em;
    line-height: 1.5em;
    margin-bottom: 1em;
    font-weight: bold;
    font-style: italic;
    color: rgba(0, 100, 185, 0.5);
  }
  section.input {
    padding-left: 1rem;
    border-left: 0.5rem solid rgba(35,80,180,0.3);
  }
  .input-name {
    text-transform: initial;
  }

  .result {
    border-radius: 5px;
    color: rgba(255, 255, 255, 0.9);
    font-family: monospace;
    font-weight: bold;
    text-transform: initial;
    padding: 0.5rem 0.5rem;
    text-align: left;
    overflow: auto;

    &.ok {
      word-break: break-all;
      background: rgba(85, 170, 95);
      font-size: 1.2rem;
    }
    &.error {
      background: rgba(170, 85, 95);
    }
  }

  .warning {
    &:before {
      content: "⚠️ ";
    }
    margin: 0.5em 0 1em 0;
    font-weight: bold;
    color: rgb(200, 150, 50);
    text-align: center;
    width: 100%;
  }
</style>
