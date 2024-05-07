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


  type Params = {
    to: string,
    calldata: string,
    args: Record<string, string[]>,
    value: string,
    hint: string,
  };
  let params : Params = {
    to: "",
    calldata: "",
    args: {},
    value: "",
    hint: "",
  };

  function getParams(p : URLSearchParams): Params {
    console.log("XXX: getParams", { p });

    const to = p.get("to") || "";
    const calldata = p.get("data") || "";
    const args = {
      [calldata.slice(0, 10)]: p.getAll("arg")
    };
    const value = p.get("value") || "";
    const hint = p.get("hint") || "";
    return {
      to, calldata, args, value, hint
    }
  }

  let builderMethods : {
    load(params: Params): Promise<void>,
  };

  // $: params = getParams($page.url.searchParams);
  page.subscribe(({ url }) => {
    const p = getParams(url.searchParams);
    if (JSON.stringify(p) === JSON.stringify(params)) return;
    params = p;
    if (builderMethods) builderMethods.load(params);
  });
</script>

<TransactionBuilder
  config={wcConfig}
  bind:methods={builderMethods}
  args={params.args}
/>
