<script lang="ts" context="module">
  export type Config = EthereumProviderOptions;
</script>

<script lang="ts">
  import { createEventDispatcher, onMount } from "svelte";

  import { EthereumProvider } from "@walletconnect/ethereum-provider";
  import type { EthereumProviderOptions } from "@walletconnect/ethereum-provider";

  interface InjectedProvider {
    enable?: () => Promise<string[]>;
    request?: (request: { method: string }) => Promise<string[]>;
  }

  interface EthereumWindow extends Window {
    ethereum?: InjectedProvider;
  }

  interface InjectedRequestError extends Error {
    code: number;
  }

  const dispatch = createEventDispatcher();

  export let accounts: Array<string> = [];

  export let config: Config = {
    // Required fields
    projectId: "",
    showQrModal: true,
    chains: [1],
  };

  let loading = false;

  // Attempt to request accounts from injected provider
  async function requestAccounts(injected?: InjectedProvider): Promise<string[]> {
    if (injected === undefined) return [];

    if (injected.request !== undefined) {
      // Resume?
      const r = await injected.request({method: 'eth_accounts'});
      if (r.length > 0) return r;

      try {
        return await injected.request({ method: "eth_requestAccounts" });
      } catch (error) {
        if ((error as InjectedRequestError).code === 4001) {
          // User rejected request
          return [];
        }
        throw error;
      }
    }

    if (injected.enable !== undefined) {
      return await injected.enable();
    }

    throw new Error("Unknown injected provider");
  }

  // FIXME: The call flow to here is janky, need to refactor
  export async function connect(force: "walletconnect"|"injected"|"any", provider?: any) {
    // Check for injected wallet
    if (force !== "walletconnect") {
      const injected = (window as EthereumWindow).ethereum as InjectedProvider;
      if (injected) {
        accounts = (await requestAccounts(injected)) || [];
        if (accounts.length > 0) {
          dispatch("connect", { provider: injected, accounts: accounts });
          return;
        }
      }
    }

    if (!provider) {
      provider = await EthereumProvider.init(
        config as EthereumProviderOptions
      );
    }

    function disconnectWalletConnect() {
      accounts = [];
      methods.disconnect = null;
      provider.disconnect();
      dispatch("disconnect");
    }

    if (provider.session) {
      // Resume WalletConnect session
      accounts = provider.accounts;
      methods.disconnect = disconnectWalletConnect;
      dispatch("connect", { provider, accounts });
      return;
    }

    provider.on("connect", () => {
      accounts = provider.accounts;
      methods.disconnect = disconnectWalletConnect;
      dispatch("connect", { provider, accounts });
    });
    provider.on("disconnect", disconnectWalletConnect);

    try {
      loading = true;
      provider.enable();
    } catch (err) {
      console.error("WalletConnect failed", err);
      methods.disconnect = null;
      dispatch("disconnect");
    } finally {
      loading = false;
    }
  }

  onMount(async () => {
    // Resume wallet sessions?

    // TODO: Make provider reactive so we can inject a new wallet connect config later, so users can BYO configs
    const walletconnect = await EthereumProvider.init(config as EthereumProviderOptions);
    if (walletconnect.session) {
      console.log("WalletConnect session detected, resuming", walletconnect.session);
      return connect("walletconnect", walletconnect);
    }

    const injected = (window as EthereumWindow).ethereum as InjectedProvider;
    if (!injected || !injected.request) return;
    const a = await injected.request({method: 'eth_accounts'});
    if (a.length > 0) {
      console.log("MetaMask session detected, resuming", a);
      return connect("injected");
    }
  });

  export const methods : {
    connect: (force: "walletconnect"|"injected"|"any", provider?: any) => void,
    disconnect: null|(() => void),
  } = {
    connect,
    disconnect: null,
  }

</script>

<div class="connect-wallet">
{#if accounts.length === 0}
  <button on:click={() => connect("any")}>
    <slot name="connect-label">Connect Wallet</slot>
  </button>

  {#if loading}
    <slot name="loading">
      <svg class="loading" width="1rem" height="1rem" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z" ><animateTransform attributeName="transform" type="rotate" dur="0.75s" values="0 12 12;360 12 12" repeatCount="indefinite"/></svg>
    </slot>
  {/if}
{:else}
  <slot name="connected">
    <dl>
      <dt><slot name="connected-label">Connected</slot></dt>
      <dd>
        {accounts[0]}
        {#if methods.disconnect}
        <label class="disconnect-button" title="Disconnect"><input type="checkbox" name="disconnect" on:change={ () => { methods.disconnect && methods.disconnect() }} /></label>
        {/if}
      </dd>
    </dl>
  </slot>
{/if}
</div>

<style lang="scss">
  :root {
    --border-radius: 5px;

    --connect-color: rgba(255, 255, 255, 1);
    --connect-background: rgba(50, 150, 255, 0.9);
    --connect-border: none;

    --connected-color: rgba(255, 555, 255, 1);
    --connected-background: linear-gradient(
      rgba(0, 140, 20, 0.5),
      rgba(0, 140, 20, 0.6)
    );
    --connected-border: none;
  }
  .connect-wallet {
    display: inherit;
    text-transform: initial;
  }
  button {
    display: inline-block;
    font-weight: bold;
    border-radius: var(--border-radius);
    padding: 0.5rem 2rem;
    margin: 0;
    cursor: pointer;
    font-size: 1rem;

    color: var(--connect-color);
    border: var(--connect-border);
    background: var(--connect-background);

    &:hover {
      opacity: 0.8;
    }
  }
  .loading {
    fill: var(--connect-background);
    vertical-align: middle;
    margin: 0.5rem;
  }
  dl {
    width: 100%;
    display: flex;
    flex-wrap: wrap;
    font-weight: bold;
    color: var(--connected-color);
    border: var(--connected-border);
    border-radius: var(--border-radius);
    background: var(--connected-background);
    margin: 0;
  }
  dt,
  dd {
    display: inline-block;
    padding: 0.5rem 0.8rem;
    margin: 0;
    font-size: 1.1em;
  }
  dd {
    flex-grow: 1;
    background: rgba(0, 100, 0, 0.2);
    border-left: var(--connected-border);
    font-family: monospace;
  }
  .disconnect-button {
    input { display: none; }

    width: 1em;
    height: 1em;
    cursor: pointer;
    float: right;
    padding: 1px;

    background-image: url('data:image/svg+xml,%3Csvg xmlns="http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg" width="24" height="24" viewBox="0 0 24 24"%3E%3Cg fill="none"%3E%3Cpath d="M24 0v24H0V0h24ZM12.593 23.258l-.011.002l-.071.035l-.02.004l-.014-.004l-.071-.035c-.01-.004-.019-.001-.024.005l-.004.01l-.017.428l.005.02l.01.013l.104.074l.015.004l.012-.004l.104-.074l.012-.016l.004-.017l-.017-.427c-.002-.01-.009-.017-.017-.018Zm.265-.113l-.013.002l-.185.093l-.01.01l-.003.011l.018.43l.005.012l.008.007l.201.093c.012.004.023 0 .029-.008l.004-.014l-.034-.614c-.003-.012-.01-.02-.02-.022Zm-.715.002a.023.023 0 0 0-.027.006l-.006.014l-.034.614c0 .012.007.02.017.024l.015-.002l.201-.093l.01-.008l.004-.011l.017-.43l-.003-.012l-.01-.01l-.184-.092Z"%2F%3E%3Cpath fill="white" d="M12 2.5a1.5 1.5 0 0 1 0 3H7a.5.5 0 0 0-.5.5v12a.5.5 0 0 0 .5.5h4.5a1.5 1.5 0 0 1 0 3H7A3.5 3.5 0 0 1 3.5 18V6A3.5 3.5 0 0 1 7 2.5Zm6.06 5.61l2.829 2.83a1.5 1.5 0 0 1 0 2.12l-2.828 2.83a1.5 1.5 0 1 1-2.122-2.122l.268-.268H12a1.5 1.5 0 0 1 0-3h4.207l-.268-.268a1.5 1.5 0 1 1 2.122-2.121Z"%2F%3E%3C%2Fg%3E%3C%2Fsvg%3E');
    background-repeat: no-repeat;
    background-size: 1em;
    background-position: bottom;
  }
</style>
