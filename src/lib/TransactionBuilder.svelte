<script lang="ts">
  import { page } from '$app/stores';
  import { pushState } from '$app/navigation';
  import { ethers } from "ethers";
  import { whatsabi, loaders } from "@shazow/whatsabi";
  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import NetworkSelector from '$lib/NetworkSelector.svelte';
  import Address from '$lib/contract/Address.svelte';
  import Summary from '$lib/contract/Summary.svelte';
  import Value from '$lib/contract/Value.svelte';
  import InputTree from '$lib/contract/InputTree.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';

  type PreparedTransaction = {
    from: string,
    to: string,
    data: string | null,
    value: bigint | null,
  }
  
  type Network = {
    chainId: bigint,
    name: string,
  };

  export let config : Config;
  export let args : Record<string, string[]>;
  let calldata : string = "";
  let value : string = "";
  let to : string = "";
  let editing : boolean = (to === "");
  let hint : string = "";
  let chainid : number = 0;

  let resetKey = {};

  export async function load(params: {calldata: string, value: string, to: string, hint: string, chainid: number}) {
    calldata = params.calldata;
    value = params.value;
    to = params.to;
    hint = params.hint;
    editing = (to === "");
    loading = {};

    if (chainid !== params.chainid) {
      await switchNetwork(params.chainid);
      chainid = params.chainid;
    }

    if (calldata.length >= 10 && hint) {
      await loadHint(hint);
    }
    if (calldata.length <= 2) { // 0x
      selectedFunction = "";
      selectedFragment = undefined;
      functionArgs = [];
      functions = [];
      preparedTx = null;
    }
    if (!to) {
      toResolved = "";
      resetKey = {}; // Nuke Address element and reinit
      result = null;
    }
  }

  let from : string;
  let toResolved : string;

  let toAddressComponent : Address;
  let connectWalletComponent : ConnectWallet;
  let networkSelectorComponent : NetworkSelector;

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
  let network : Network|null = null;
  let loading : Record<string, boolean> = {};

  const abiLoader = new loaders.MultiABILoader([
    new loaders.SourcifyABILoader(),
    new loaders.EtherscanABILoader({
      // TODO: Move to config container
      apiKey: "SHT8M9JSGR62U5U7YVFUSTPG41IVR1F7ND",
    }),
  ]);

  async function loadHint(hint: string) {
    const maybeABI = ethers.Interface.from(["function " + hint]);
    const fn = maybeABI.getFunction(calldata.slice(0, 10));
    if (!fn) return;

    selectedFunction = fn.selector;
    abi = maybeABI;
    functions = [fn];
    updateFunction();
    log.info('Loaded partial ABI from hint');

    if (provider) await toAddressComponent.resolve("mount");
    else if (to) await loadAddress();
  }

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
    // TODO: Resolve relative to some chainID?
    const r = ethers.resolveAddress(value, defaultProvider);
    if (r instanceof Promise) return r;
    return Promise.resolve(r);
  };

  function prepareTransaction(from: string, to: string, calldata: string, value: string): PreparedTransaction {
    const tx : PreparedTransaction = {
      from: from,
      to: to,
      data: null,
      value: null,
    };
    if (calldata) tx.data = calldata;
    if (value && value !== "0") tx.value = ethers.parseEther(value);
    return tx;
  }

  async function handleSubmit() {
    if (loading.submit) {
      log.info("Already submitting, ignored new submit");
      return;
    }
    result = null;
    preparedTx = null;
    log.info("Submitting preview transaction", { from, toResolved, calldata, value, provider });

    if (!provider) {
      return log.error("Ethereum provider not available");
    }

    if (!toResolved) {
      log.info("Transaction 'to' field is not resolved");
      toResolved = await toAddressComponent.resolve("submit");
    }

    const tx = prepareTransaction(from, toResolved || to, calldata, value);
    if (!tx.to) {
      // TODO: We can remove this check once ethers.js v6 bug is fixed?
      return log.error("Failed resolving 'to' address");
    }

    loading.submit = true;
    let stale = false;
    try {
      const r = await provider.call(tx);
      result = {
        status: "ok",
      };
      if (selectedFragment && selectedFragment.outputs?.length > 0) {
        // TODO: Use this function once its implemented: abi.parseCallResult(r)
        const res = abi.decodeFunctionResult(selectedFragment, r);
        result.value = res.toString();
      }
      log.info("Loaded result", result);

      const currentTx = prepareTransaction(from, toResolved || to, calldata, value);
      stale = tx.to !== currentTx.to && tx.data !== currentTx.data && tx.value !== currentTx.value;
      if (stale) {
        log.info("Removed stale result:", result);
        result = null;
      }
    } catch(err) {
      return log.error(err as Error);
    } finally {
      loading.submit = false;
      if (stale) return;
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
    result = null;

    if (!provider || !to) {
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
        addressResolver: resolver,
        ... whatsabi.loaders.defaultsWithEnv({
          SOURCIFY_CHAIN_ID: chainid,
        }),
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
    } else if (r.abi.length === 0) {
      functions = [];
      abi = ethers.Interface.from([]);
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

  async function switchNetwork(newChainId: number, wallet?: { provider: any }) {
    if (!signer) {
      log.info("[TransactionBuilder:switchNetwork] Not a signer, changing selector and skipping", { chainid: newChainId });
      return networkSelectorComponent.change(newChainId);
    }
    if (newChainId === 0) {
      log.info("[TransactionBuilder:switchNetwork] Any chain, skipping", { chainid: newChainId });
      return;
    }
    const browserProvider = signer.provider as ethers.BrowserProvider;
    const params = [{ "chainId": "0x" + newChainId.toString(16) }];
    try {
      await browserProvider.send("wallet_switchEthereumChain", params);
      log.info(`Switched network on signer wallet`, { chainid: newChainId });
    } catch (error) {
      if ((error as Error).message.includes("Unrecognized chain ID")) {
        log.error(`Requested to switch to chainId ${newChainId}, but wallet is not aware of it. Use chainlist.org to add chain details first.`);
      }

      // Reset dropdown
      const n = await browserProvider.getNetwork();
      networkSelectorComponent.change(Number(n.chainId));
      network = n;

      throw error;
    }

    chainid = newChainId;
    connectWalletComponent.methods.connect("any");
  }

  async function connect(wallet: { provider: any, accounts: string[] }) {
    const browserProvider = new ethers.BrowserProvider(wallet.provider);
    const n = await browserProvider.getNetwork();
    const newChainId = Number(n.chainId);

    if (chainid !== 0 && chainid !== newChainId) {
      log.info("[TransactionBuilder:connect] Mismatched chainid, attempting to switch", { to: chainid, from: newChainId });
      signer = await browserProvider.getSigner();
      await switchNetwork(chainid, wallet);
      return;
    }

    await setProvider(wallet.provider, newChainId);
    network = n;
  }

  async function setProvider(provider: any, newChainId: number) {
    const browserProvider = new ethers.BrowserProvider(provider);
    signer = await browserProvider.getSigner();
    provider = browserProvider;
    from = await signer.getAddress();
    chainid = newChainId;

    log.info("Connected wallet", {from, chainid});
    if (to) toAddressComponent.resolve("connect");
  }

  async function disconnect() {
    log.info("Wallet disconnected");
    provider = defaultProvider;
    signer = undefined;
    network = null;
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
    if (chainid > 1) state.chainid = chainid.toString();

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

    pushState($page.url, state);
    editing = false;
  }

  async function onNetworkChanged(event: CustomEvent) {
    const n = event.detail.network;
    if (signer) {
      await switchNetwork(n.chainid);
    } else if (n === undefined || n.chainid === 0) {
      chainid = 0; // Accept any
      connectWalletComponent.methods.connect("any");
    } else {
      // Fallback provider composed of all the network.rpc[] endpoints
      provider = new ethers.FallbackProvider(
        n.rpc.map((url: string) => new ethers.JsonRpcProvider(url))
      );
      chainid = n.chainid;
      network = await provider.getNetwork();
      log.info(`Network changed to ${n.name}`, network, provider);
      await loadAddress();
    }
  }

  function onInputsChanged(event: CustomEvent) {
    if (!form.checkValidity()) {
      calldata = "";
      form.reportValidity();
      return;
    }
    const context = event.detail as { values: string[], resolved: string[] };
    calldata = selectedFragment && abi.encodeFunctionData(selectedFragment, context.resolved) || "";
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
    <h2>Network</h2>
    <NetworkSelector bind:this={networkSelectorComponent} selected={chainid} on:change={ onNetworkChanged } />
  </section>

  <section>
    <h2>From</h2>
    <ConnectWallet bind:this={connectWalletComponent} chainid={ chainid } config={ config } on:connect={ (e) => connect(e.detail) } on:disconnect={ disconnect } on:changed={ (e) => switchNetwork(e.detail.chainid, { provider: e.detail.provider }) }>
      <svelte:fragment slot="connected-label">{ (network?.name !== "unknown" && network?.name) || (network?.chainId && `Chain ${network?.chainId}`) || "Connected" }</svelte:fragment>
    </ConnectWallet>
  </section>

  <section>
    {#key resetKey}
    <Address required disabled={ !editing } bind:this={ toAddressComponent } resolver={ resolver } bind:value={ to } on:change={ loadAddress }><h2>To</h2></Address>
    {/key}
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
  <section class="inputs">
    <InputTree inputs={selectedFragment.inputs} initialValues={functionArgs} resolver={resolver} on:change={ onInputsChanged } />
  </section>
  {/if}

  {#if calldata || editing}
  <section>
    <label>
      <h2>Calldata</h2>
      <textarea name="calldata" bind:value={calldata} placeholder="0x" disabled></textarea>
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
  <hr />

  <section>
    <h2>Execute On-chain</h2>
    {#if !signer}
    <button class="icon-connect" on:click|preventDefault={ _ => connectWalletComponent.methods.connect("any") } >Connect Wallet</button>
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
  <h3>Callthis is a transaction builder...</h3>
  <ul>
    <li><strong>Generate an interface for any contract</strong>, even if it's unverified. (Powered by <a target="_blank" href="https://github.com/shazow/whatsabi">WhatsABI</a>)</li>
    <li>Build a transaction and save it as a link that can be shared and executed later. (Example: <a href="/?to=callthis.eth&value=0.1">Send 0.1 ETH to <code>callthis.eth</code></a>)</li>
    <li><strong>Works with any EVM chain</strong>, with WalletConnect or Safe Wallets or browser-injected providers.</li>
    <li>Address fields automatically resolved with ENS.</li>
    <li>Supports complex contract inputs with tuples, arrays, etc.</li>
    <li>No backend services required, <a href="https://github.com/shazow/callthis">grab the source</a> and <strong>run it locally for privacy and censorship-resistance</strong>!</li>
    <li>Permissively licensed under MIT, use it in your products.</li>
  </ul>
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
    margin: 0.5em 0 1em 0;
    font-weight: bold;
    color: rgb(200, 150, 50);
    text-align: center;
    width: 100%;

    &:before {
      content: "⚠️ ";
    }
  }

  hr {
    margin: 2.5em auto;
    width: 20%;
  }
</style>
