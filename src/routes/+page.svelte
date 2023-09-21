<script lang="ts">
  import { page } from '$app/stores';

  import TransactionBuilder from '$lib/TransactionBuilder.svelte';
  import type { Config } from '$lib/ConnectWallet.svelte';

  const wcConfig : Config = {
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

  let to : string = $page.url.searchParams.get("to") || "";
  let calldata : string = $page.url.searchParams.get("data") || "";
  let args : Record<string, string[]> = {
    [calldata.slice(0, 10)]: $page.url.searchParams.getAll("arg")
  };
  let value : string = $page.url.searchParams.get("value") || "";
</script>

<h2>Link a transaction to execute</h2>

<TransactionBuilder config={ wcConfig } to={ to } calldata={ calldata } args={ args } value={ value }/>
