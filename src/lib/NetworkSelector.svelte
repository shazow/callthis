<script lang="ts">
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  type Network = {
    chainid: number;
    name: string;
    rpc: string[];
  };

  // Get more from here https://chainlist.org/
  export let networks : Network[] = [
      { chainid: 0, name: "↪️ Injected Provider via Connected Wallet", rpc: [], },
      { chainid: 1, name: "Ethereum Mainnet", rpc: ["https://eth.llamarpc.com", "https://ethereum-rpc.publicnode.com"] },
      { chainid: 10, name: "OP Mainnet (Optimism)", rpc: ["https://optimism.llamarpc.com", "https://optimism-rpc.publicnode.com"] },
      { chainid: 56, name: "Binance Smart Chain", rpc: ["https://bsc.llamarpc.com"] },
      { chainid: 137, name: "Polygon", rpc: ["https://polygon.llamarpc.com", "https://polygon-bor-rpc.publicnode.com"] },
      { chainid: 8453, name: "Base", rpc: ["https://base.llamarpc.com", "https://base-rpc.publicnode.com"] },
      { chainid: 42161, name: "Arbitrum One", rpc: ["https://arb1.arbitrum.io/rpc", "https://arbitrum-one-rpc.publicnode.com"] },
  ];

  export let selected : number = 1;

  export let disabled : boolean = false;

  // Set of available network chains
  const available = new Set<Number>(networks.map(n => n.chainid));

  function onChange(event: Event) {
    // `selected` is updated after the event is emitted, so can't reliably use it here.
    const target = event.target as HTMLSelectElement;
    const chainid = Number(target.value);
    dispatch("change", { network: networks.find(n => n.chainid === chainid) ?? networks[0] });
  };

  export function change(chainid: number) {
    if (chainid === selected) return;
    selected = chainid;
    dispatch("change", { network: networks.find(n => n.chainid === chainid) ?? networks[0] });
  }
</script>

{#if available.has(selected)}
<select on:change={onChange} bind:value={selected} {disabled}>
  {#each networks as network (network.chainid)}
    <option value={network.chainid} selected={network.chainid === selected}>{network.name}</option>
  {/each}
</select>
{:else}
<select disabled={true}><option selected={true}>{networks[0].name}</option></select>
{/if}
