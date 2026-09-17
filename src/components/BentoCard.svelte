<script>
  export let span = 3   // column span: 3, 4, 6, 12
  export let rows = 1   // row span: 1, 2, 3
  export let noPad = false
  export let noHover = false
  export let style = ''
</script>

<div
  class="card bento-card span-{span} {rows > 1 ? `row-${rows}` : ''} {noHover ? 'no-hover' : ''}"
  class:no-pad={noPad}
  style={style}
>
  <slot />
</div>

<style>
  .bento-card { height: 100%; }
  .no-pad { padding: 0; overflow: hidden; }
  .no-hover:hover { transform: none !important; border-color: var(--surface-border) !important; }
</style>
