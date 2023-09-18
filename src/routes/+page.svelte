<script lang="ts">
  import { ethers } from "ethers";

  import ConnectWallet from '$lib/ConnectWallet.svelte';
  import Caller from '$lib/Caller.svelte';

  const wcConfig = {
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
    },
  }

  let provider : ethers.BrowserProvider;
  let account : string;
  let address : string;
  let calldata : string;

  async function connect(wallet: { provider: any, accounts: string[] }) {
    provider = new ethers.BrowserProvider(wallet.provider);
    account = wallet.accounts[0];
  }
</script>

<h2>Link a transaction to execute</h2>

<Caller provider={ provider } account={ account } address={ address } calldata={ calldata }>
  <ConnectWallet config={ wcConfig } on:connect="{ (e) => connect(e.detail) }" slot="connect" />
</Caller>

<style lang="scss">
</style>
