<button on:click={connect}><slot>Connect Wallet</slot></button>

<script lang="ts">
import { createEventDispatcher } from 'svelte';

import { EthereumProvider } from '@walletconnect/ethereum-provider';

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

export let accounts : Array<string> = [];

export let config = {
};

const defaultConfig = {
  projectId: '0d978989ffd34e4518ed5410dad59fa4', // required
  showQrModal: true,
  qrModalOptions: { themeMode: "dark" },
  chains: [1],
  optionalChains: [11155111], // Sepolia
  metadata: {
    name: "Call This?",
    description: "Share a transaction for someone else to call",
    url: "https://callthis.eth",
    icons: ["https://callthis.eth.link/icon-128px.png"],
  }
}

// Attempt to request accounts from injected provider
async function requestAccounts(injected?: InjectedProvider) {
  if (injected === undefined) return [];

  if (injected.enable !== undefined) {
    return await injected.enable();
  }
  if (injected.request === undefined) {
    throw new Error("Unknown injected provider");
  }

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

export async function connect() {
  const injected = (window as EthereumWindow).ethereum as InjectedProvider;
  if (injected) {
    const r = await requestAccounts(injected);
    if (r && r.length > 0) {
      for (const account of r) {
        accounts.push(account);
      }

      dispatch("connect", {provider: injected, accounts: accounts});
      return;
    }
  }

  const provider = await EthereumProvider.init(Object.assign({}, defaultConfig, config));

  provider.on("connect", () => {
    console.log("Loaded accounts:", provider.accounts);

    for (const account of provider.accounts) {
      accounts.push(account);
    }

    dispatch("connect", {provider, accounts});
  });
  provider.on('disconnect', () => {
    accounts = [];
    dispatch("disconnect");
  })

  try {
    provider.connect();
  } catch(err) {
    console.error("WalletConnect failed", err);
    dispatch("disconnect");
    return;
  }
}
</script>
