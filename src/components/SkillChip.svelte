<script>
  export let name = ''
  export let removable = false
  export let on_remove = null
</script>

<span class="chip">
  {name}
  {#if removable}
    <button class="chip-remove" on:click={() => on_remove && on_remove()} aria-label="Remove {name}">×</button>
  {/if}
</span>
