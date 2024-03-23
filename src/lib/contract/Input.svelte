<script lang="ts">
  import type { Param } from "./param.js";
  import Address from "./Address.svelte";

  export let input : Param;

  export let componentArgs: any = {};

  function extendArray(param: Param): Param {
    if (!param.childrenExtendType) throw new Error("Param.extendArray: must have childrenExtendType");

    if (param.children === undefined) {
      param.children = new Array<Param>();
    }

    param.children = [
      ...param.children,
      Object.assign({}, param.childrenExtendType),
    ];
    return param;
  }

  function shrinkArray(param: Param): Param {
    if (!param.children) throw new Error("Param.shrinkArray: must have children");
    param.children.pop();
    return param;
  }

</script>

<details open class="input">
  <summary>{input.type.name} ({input.type.baseType})</summary>
  {#if input.children }
    {#each input.children as p}
      <svelte:self input={ p } componentArgs={ componentArgs } />
    {/each}

    {#if input.childrenExtendType}
      <button on:click|preventDefault={ () => { input = extendArray(input) } }>+</button>
      <button on:click|preventDefault={ () => { input = shrinkArray(input) } } disabled={ !input.children.length }>-</button>
      <span>{input.childrenExtendType.type.format()}</span>
    {/if}

  {:else if input.type.baseType === "address"}
    <Address required bind:value={ input.value } bind:resolved={ input.resolved } {...componentArgs}><span>{input.type.name}</span></Address>

  {:else}
    <input type="text" required bind:value={ input.value } {...componentArgs} />
    <aside>{input.type.baseType}</aside>
  {/if}
</details>

<style lang="scss">
details {
  margin-left: 1em;
  margin-bottom: 0.5em;
  border-left: 1px solid rgba(0, 0, 0, 0.1);
}

button {
  width: initial;
}
</style>
