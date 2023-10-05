<script lang="ts">
  export let to: string;
  export let callSignature: string | undefined;
  export let value: string;

  $: show = to || callSignature || value;
  // TODO: Detect ERC transfers and explain
</script>

{#if show}
  <quote>
    {#if callSignature}
      Call <code>{callSignature}</code>
      {#if to}
        on contract at <code>{to}</code>
      {:else}
        ...
      {/if}
      {#if value}
        with <code>{value} ether</code>
      {/if}
    {:else if value}
      Send <code>{value} ether</code>
      {#if to}
        to <code>{to}</code>
      {:else}
        ...
      {/if}
    {:else if to}
      Call contract at
      {#if to}
        <code>{to}</code>
      {/if}
      without any data
    {/if}
  </quote>
{/if}

<style lang="scss">
  :root {
    --background: rgba(255, 210, 70, 0.3);
    --border-left: 5px solid rgba(255, 160, 70, 0.8);

    --highlight-background: rgba(255, 210, 70, 0.6);
    --highlight-color: rgba(190, 120, 0, 0.9);
  }

  quote {
    color: rgba(0, 0, 0, 0.8);
    display: block;
    border-left: var(--border-left);
    border-radius: 5px;
    background: var(--background);
    padding: 0.3em 0.5em;
    line-height: 1.7em;
    font-size: 1rem;
    font-weight: bold;
    margin-bottom: 1em;

    code {
      background: var(--highlight-background);
      font-weight: bold;
      padding: 0.1em 0.3em;
      color: var(--highlight-color);
      border-radius: 3px;
    }
  }
</style>
