<script lang="ts">
  import ConnectWallet from '$lib/ConnectWallet.svelte';

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
</script>

<h2>Link a transaction to execute</h2>

<p>
    <ConnectWallet config={ wcConfig } on:connect="{ ({ detail }) => { console.log(detail) }}" />
</p>
<p>...</p>

<style lang="scss">
</style>
