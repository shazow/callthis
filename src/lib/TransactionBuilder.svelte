<script lang="ts">
  import { page } from '$app/stores';
  import { pushState } from '$app/navigation';
  import {
    createPublicClient,
    createWalletClient,
    http,
    custom,
    fallback,
    parseEther,
    encodeFunctionData,
    decodeFunctionResult,
    decodeFunctionData,
    toFunctionSelector,
    toFunctionSignature,
    type PublicClient,
    type WalletClient,
    type AbiFunction,
    type Hex,
    type Address as ViemAddress,
    type Abi,
    type Transport,
    type Account
  } from "viem";
  import { mainnet } from "viem/chains";
  import { normalize } from 'viem/ens';
  import { whatsabi, loaders } from "@shazow/whatsabi";
  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import NetworkSelector from '$lib/NetworkSelector.svelte';
  import Address from '$lib/contract/Address.svelte';
  import Summary from '$lib/contract/Summary.svelte';
  import Value from '$lib/contract/Value.svelte';
  import InputTree from '$lib/contract/InputTree.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';
  import type { Params } from '$lib/types';

  type PreparedTransaction = {
    account?: ViemAddress,
    to: ViemAddress,
    data: Hex | undefined,
    value: bigint | undefined,
    chain?: any
  }
  
  type Network = {
    chainId: bigint,
    name: string,
    rpc: string[]
  };

  export let config : Config;
  export let args : Record<string, string[]>;
  let calldata : string = "";
  let value : string = "";
  let expectFrom : string = "";
  let to : string = "";
  let editing : boolean = (to === "");
  let hint : string = "";
  let chainid : number = 0;
  let switchedNetwork = false;

  let resetKey = {};

  export async function load(params: Params) {
    calldata = params.calldata;
    value = params.value;
    to = params.to;
    expectFrom = params.from && await resolver(params.from) || "";
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

  // Default provider (mainnet)
  const defaultProvider = createPublicClient({
    chain: mainnet,
    transport: http()
  });
  const defaultChainId = 1;
  let activeProvider : PublicClient = defaultProvider;
  let signer : WalletClient | undefined = undefined;
  let abi : Abi = [];
  let functions : AbiFunction[] = [];
  let functionsFor : string;
  let selectedFunction : string; // selector (sighash)
  let selectedFragment : AbiFunction | undefined;
  let result : { status: "error"|"ok", message?:string, value?:any} | null = null;
  let receipt : any | null; // TransactionReceipt
  let form : HTMLFormElement;
  let functionArgs : Array<string>;
  let preparedTx : PreparedTransaction | null = null;
  let network : Network|null = null;
  let loading : Record<string, boolean> = {};

  const env = {
    ETHERSCAN_API_KEY: "SHT8M9JSGR62U5U7YVFUSTPG41IVR1F7ND",
  };

  async function loadHint(hint: string) {
    const { parseAbi } = await import("viem");
    const maybeABI = parseAbi(["function " + hint]);
    const fn = maybeABI[0] as AbiFunction;
    if (!fn) return;

    selectedFunction = toFunctionSelector(fn);
    abi = maybeABI;
    functions = [fn];
    updateFunction();
    log.info('Loaded partial ABI from hint');

    if (activeProvider) await toAddressComponent.resolve("mount");
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

  async function resolver(value: string): Promise<string> {
    log.info(`Resolving address: ${value}`);
    if (value.endsWith(".eth")) {
        const r = await defaultProvider.getEnsAddress({ name: normalize(value) });
        return r || value;
    }
    return value;
  };

  function prepareTransaction(from: string, to: string, calldata: string, value: string): PreparedTransaction {
    const tx : PreparedTransaction = {
      account: from as ViemAddress,
      to: to as ViemAddress,
      data: calldata ? calldata as Hex : undefined,
      value: (value && value !== "0") ? parseEther(value) : undefined,
    };
    return tx;
  }

  function formatResult(res: any): string {
      if (typeof res === 'bigint') {
          return res.toString();
      }
      if (Array.isArray(res)) {
          return `[${res.map(formatResult).join(", ")}]`;
      }
      if (typeof res === 'object' && res !== null) {
          // Try to stringify
          try {
              // Check if it has a custom toString or something useful?
              // JSON stringify handles bigints poorly by default, let's use replacer
              return JSON.stringify(res, (key, value) =>
                  typeof value === 'bigint'
                      ? value.toString()
                      : value // return everything else unchanged
              );
          } catch {
              return res.toString();
          }
      }
      return String(res);
  }

  async function handleSubmit() {
    if (loading.submit) {
      log.info("Already submitting, ignored new submit");
      return;
    }
    result = null;
    preparedTx = null;
    log.info("Submitting preview transaction", { from, toResolved, calldata, value, provider: activeProvider });

    if (!activeProvider) {
      return log.error("Ethereum provider not available");
    }

    if (!toResolved) {
      log.info("Transaction 'to' field is not resolved");
      toResolved = await toAddressComponent.resolve("submit");
    }

    const tx = prepareTransaction(from, toResolved || to, calldata, value);
    if (!tx.to) {
      return log.error("Failed resolving 'to' address");
    }

    loading.submit = true;
    let stale = false;
    try {
      // call
      const r = await activeProvider.call(tx);
      result = {
        status: "ok",
      };

      if (selectedFragment && selectedFragment.outputs && selectedFragment.outputs.length > 0) {
        const res = decodeFunctionResult({
            abi: [selectedFragment],
            functionName: selectedFragment.name,
            data: r.data || "0x"
        });
        result.value = formatResult(res);
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
      // sendTransaction
      // Need to ensure account is provided properly
      const account = preparedTx.account || from as ViemAddress;

      let hash = await signer.sendTransaction({
        ...preparedTx,
        account: account, // Explicitly pass account
        chain: null // Let the wallet decide or use current chain
      });
      log.info("Waiting for transaction: ", hash);
      receipt = await activeProvider.waitForTransactionReceipt({ hash });
    } catch (err) {
        log.error(err as Error);
    } finally {
      loading.submit = false;
    }
  }

  async function loadAddress(event?: CustomEvent) {
    result = null;

    if (!activeProvider || !to) {
      return;
    }
    if (event) toResolved = event.detail.resolved;
    if (functionsFor != to) functions = [];

    let r;
    loading.to = true;

    const abiLoaders : Array<loaders.ABILoader> = [
      new loaders.SourcifyABILoader({ chainId: chainid }),
      new loaders.EtherscanABILoader({ apiKey: env.ETHERSCAN_API_KEY }),
    ];
    if (chainid !== 1) {
      // Add mainnet just in case
      abiLoaders.push(
        new loaders.SourcifyABILoader({ chainId: 1 })
      );
    }

    try {
      r = await whatsabi.autoload(to, {
        provider: activeProvider as any,

        abiLoader: new loaders.MultiABILoader(abiLoaders),
        signatureLookup: loaders.defaultSignatureLookup,

        followProxies: true,
        onProgress: (progress, ...args: any[]) => log.info("WhatsABI:", progress, args),
        addressResolver: resolver,
      });
    } catch (err) {
        log.error("WhatsABI failed: " + err);
        loading.to = false;
        return;
    } finally {
      loading.to = false;
    }

    log.info(`Loaded ABI: ${r.abi?.length} items from ${r.address}`)

    selectedFunction = calldata.slice(0, 10);
    if (functions.length === 0 || r.abi.length > 0) {
      abi = r.abi as Abi;
      functions = [];
      // Filter for functions
      for (const item of abi) {
          if (item.type === 'function') {
              functions.push(item);
          }
      }
    } else if (r.abi.length === 0) {
      functions = [];
      abi = [];
    }

    updateFunction();
  }

  function updateFunction() {
    functionsFor = to;

    if (calldata.slice(0, 10) !== selectedFunction) {
      calldata = selectedFunction
    }

    selectedFragment = functions.find(f => toFunctionSelector(f) === selectedFunction);
    functionArgs = args[selectedFunction] || [];

    if (calldata.length > 10 && selectedFragment) {
      // Calldata has args that we can parse
      try {
        const decoded = decodeFunctionData({
            abi: [selectedFragment],
            data: calldata as Hex
        });
        if (decoded.args && Array.isArray(decoded.args)) {
             functionArgs = decoded.args.map(a => a.toString());
        }
      } catch (e) {
          console.error("Failed to decode calldata", e);
      }
    }
  }

  async function switchNetwork(newChainId: number, wallet?: { provider: any }) {
    switchedNetwork = true;
    if (!signer) {
      log.info("[TransactionBuilder:switchNetwork] Not a signer, changing selector and skipping", { chainid: newChainId });
      return networkSelectorComponent.change(newChainId);
    }
    if (newChainId === 0) {
      log.info("[TransactionBuilder:switchNetwork] Any chain, skipping", { chainid: newChainId });
      return;
    }

    // WalletClient switchChain
    try {
      await signer.switchChain({ id: newChainId });
      log.info(`Switched network on signer wallet`, { chainid: newChainId });
    } catch (error) {
      if ((error as Error).message.includes("Unrecognized chain ID")) {
        log.error(`Requested to switch to chainId ${newChainId}, but wallet is not aware of it. Use chainlist.org to add chain details first.`);
      }

      // Reset dropdown
      const chainId = await signer.getChainId();
      networkSelectorComponent.change(chainId);

      throw error;
    }

    chainid = newChainId;
    connectWalletComponent.methods.connect("any");
  }

  async function connect(wallet: { provider: any, accounts: string[] }) {
    // Wallet provider (EIP-1193)

    const transport = custom(wallet.provider);
    const walletClient = createWalletClient({
        transport
    });

    const newChainId = await walletClient.getChainId();

    if (chainid !== 0 && chainid !== newChainId) {
      log.info("[TransactionBuilder:connect] Mismatched chainid, attempting to switch", { to: chainid, from: newChainId });
      try {
        await walletClient.switchChain({ id: chainid });
      } catch(e) {
          console.error("Failed switch chain", e);
      }
    }

    await setProvider(wallet.provider, newChainId);
  }

  async function setProvider(provider: any, newChainId: number) {
    // Provider for Wallet Client
    signer = createWalletClient({
        transport: custom(provider)
    });

    // Provider for Public Client (Read)
    activeProvider = createPublicClient({
        transport: custom(provider)
    });

    const addresses = await signer.getAddresses();
    from = addresses[0];
    chainid = newChainId;
    switchedNetwork = true;

    network = {
        chainId: BigInt(chainid),
        name: "Unknown",
        rpc: []
    };

    log.info("Connected wallet", {from, chainid});
    if (to) toAddressComponent.resolve("connect");
  }

  async function disconnect() {
    log.info("Wallet disconnected");
    activeProvider = defaultProvider;
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
      hint: selectedFragment ? toFunctionSignature(selectedFragment) : undefined,
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
      const transports = n.rpc.map((url: string) => http(url));
      activeProvider = createPublicClient({
          transport: fallback(transports)
      });

      chainid = n.chainid;
      network = n;
      log.info(`Network changed to ${n.name}`, network, activeProvider);
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
    if (selectedFragment) {
        calldata = encodeFunctionData({
            abi: [selectedFragment],
            functionName: selectedFragment.name,
            args: context.resolved
        });
    } else {
        calldata = "";
    }
    functionArgs = context.resolved;
  }

  type FunctionsByStateMutability = Record<"payable"|"nonpayable"|"readonly"|"unknown", AbiFunction[]>;

  function splitMutability(fns: AbiFunction[]): FunctionsByStateMutability {
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
      else if (f.stateMutability === "view" || f.stateMutability === "pure") r.readonly.push(f);
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
    <NetworkSelector bind:this={networkSelectorComponent} selected={switchedNetwork ? chainid : defaultChainId} on:change={ onNetworkChanged } />
  </section>

  <section>
    <h2>From</h2>
    <ConnectWallet bind:this={connectWalletComponent} chainid={ chainid } config={ config } on:connect={ (e) => connect(e.detail) } on:disconnect={ disconnect } on:changed={ (e) => switchNetwork(e.detail.chainid, { provider: e.detail.provider }) }>
      <svelte:fragment slot="connected-label">{ (network?.name !== "unknown" && network?.name) || (network?.chainId && `Chain ${network?.chainId}`) || "Connected" }</svelte:fragment>
    </ConnectWallet>

    {#if from && expectFrom && expectFrom !== from}
    <p class="warning">Does not match expected "from" address:<br/><code>{expectFrom}</code></p>
    {/if}
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
        <option value={toFunctionSelector(f)}>{toFunctionSignature(f)}</option>
        {/each}
        {#if splitFunctions.payable.length}
        <optgroup label="Payable">
          {#each splitFunctions.payable as f}
          <option value={toFunctionSelector(f)}>{toFunctionSignature(f)}</option>
          {/each}
        </optgroup>
        {/if}
        {#if splitFunctions.nonpayable.length}
        <optgroup label="Writeable">
          {#each splitFunctions.nonpayable as f}
          <option value={toFunctionSelector(f)}>{toFunctionSignature(f)}</option>
          {/each}
        </optgroup>
        {/if}
        {#if splitFunctions.readonly.length}
        <optgroup label="Readable">
          {#each splitFunctions.readonly as f}
          <option value={toFunctionSelector(f)}>{toFunctionSignature(f)}</option>
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
    <Summary to={ toResolved || to } value={value} callSignature={selectedFragment ? toFunctionSignature(selectedFragment) : undefined} />
  </section>

  <section>
    <h2>Transaction</h2>
    {#if editing}
    <button class="icon-save" on:click|preventDefault={ updateLink }>Save Link</button>
    {:else}
    <button class="icon-edit" on:click|preventDefault={ () => { editing = true }}>Edit</button>
    {/if}
    <input type="submit" class="icon-call" value="Preview Call" disabled={ !activeProvider || !to || loading.submit }>
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
