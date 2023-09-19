<script lang="ts">
  import { page } from '$app/stores';

  import Caller from '$lib/Caller.svelte';
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

  let address : string = $page.url.searchParams.get("address") || "";
  let calldata : string = $page.url.searchParams.get("calldata") || "";
  let value : string = $page.url.searchParams.get("value") || "";
</script>

<h2>Link a transaction to execute</h2>

<Caller config={ wcConfig } address={ address } calldata={ calldata } value={ value }/>

<style lang="scss">
</style>
