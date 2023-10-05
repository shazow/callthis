<script lang="ts" context="module">
  export type Config = EthereumProviderOptions;
</script>

<script lang="ts">
  import { createEventDispatcher } from "svelte";

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
  async function requestAccounts(injected?: InjectedProvider) {
    if (injected === undefined) return [];

    if (injected.request !== undefined) {
      try {
        return await injected.request({ method: "eth_requestAccounts" });
      } catch (error) {
        if ((error as InjectedRequestError).code === 4001) {
          // User rejected request
          return;
        }
        throw error;
      }
    }

    if (injected.enable !== undefined) {
      return await injected.enable();
    }

    throw new Error("Unknown injected provider");
  }

  export async function connect() {
    const injected = (window as EthereumWindow).ethereum as InjectedProvider;
    if (injected) {
      accounts = (await requestAccounts(injected)) || [];
      if (accounts.length > 0) {
        dispatch("connect", { provider: injected, accounts: accounts });
        return;
      }
    }

    loading = true;
    const provider = await EthereumProvider.init(
      config as EthereumProviderOptions
    );

    provider.on("connect", () => {
      accounts = provider.accounts;
      dispatch("connect", { provider, accounts });
    });
    provider.on("disconnect", () => {
      accounts = [];
      dispatch("disconnect");
    });

    try {
      provider.connect();
    } catch (err) {
      console.error("WalletConnect failed", err);
      dispatch("disconnect");
    } finally {
      loading = false;
    }
  }

  export const methods = {
    connect,
  }
</script>

{#if accounts.length === 0}
  <button on:click={connect}>
    <slot name="connect-label">Connect Wallet</slot>
  </button>

  {#if loading}
    <slot name="loading">
      <svg
        class="loading"
        width="1rem"
        height="1rem"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
        ><path
          d="M10.14,1.16a11,11,0,0,0-9,8.92A1.59,1.59,0,0,0,2.46,12,1.52,1.52,0,0,0,4.11,10.7a8,8,0,0,1,6.66-6.61A1.42,1.42,0,0,0,12,2.69h0A1.57,1.57,0,0,0,10.14,1.16Z"
          ><animateTransform
            attributeName="transform"
            type="rotate"
            dur="0.75s"
            values="0 12 12;360 12 12"
            repeatCount="indefinite"
          /></path
        ></svg
      >
    </slot>
  {/if}
{:else}
  <slot name="connected">
    <dl>
      <dt>Connected</dt>
      <dd>{accounts[0]}</dd>
    </dl>
  </slot>
{/if}

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
  }
  dd {
    flex-grow: 1;
    background: rgba(0, 100, 0, 0.2);
    border-left: var(--connected-border);
    font-family: monospace;
    font-size: 1rem;
  }
</style>
