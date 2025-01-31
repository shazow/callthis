<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';

  import TransactionBuilder from '$lib/TransactionBuilder.svelte';
  import type { Params } from '$lib/types';
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


  let params : Params = {
    from: "",
    to: "",
    calldata: "",
    args: {},
    value: "",
    hint: "",
    chainid: 0,
  };

  function getParams(p : URLSearchParams): Params {
    const from = p.get("from") || "";
    const to = p.get("to") || "";
    const defaultChain = to ? 1 : 0; // 0 is "use whatever is injected"
    const calldata = p.get("data") || "";
    const args = {
      [calldata.slice(0, 10)]: p.getAll("arg")
    };
    const value = p.get("value") || "";
    const hint = p.get("hint") || "";
    const chainid = Number(p.get("chainid") || defaultChain);
    return {
      from, to, calldata, args, value, hint, chainid
    }
  }

  let transactionBuilder : TransactionBuilder;

  // $: params = getParams($page.url.searchParams);
  page.subscribe(({ url }) => {
    const p = getParams(url.searchParams);
    if (JSON.stringify(p) === JSON.stringify(params)) return;
    params = p;
    transactionBuilder?.load(params);
  });

  onMount(() => {
    transactionBuilder?.load(params);
  });
</script>

<TransactionBuilder
  config={wcConfig}
  bind:this={transactionBuilder}
  args={params.args}
/>
