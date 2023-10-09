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
      name: "callthis.eth",
      description: "Build a transaction for someone else to execute",
      url: window.location.origin,
      icons: [window.location.origin + "/favicon.png"],
    },
  }

  let editing : boolean = false;

  function getParams(p : URLSearchParams) {
    const to = p.get("to") || "";
    const calldata = p.get("data") || "";
    const args = {
      [calldata.slice(0, 10)]: p.getAll("arg")
    };
    const value = p.get("value") || "";
    const hint = p.get("hint") || "";
    editing = (to === "");
    return {
      to, calldata, args, value, hint
    }
  }

  $: params = getParams($page.url.searchParams);
</script>

<TransactionBuilder config={ wcConfig } editing={editing} to={ params.to } calldata={ params.calldata } args={ params.args } value={ params.value } hint={ params.hint }/>

