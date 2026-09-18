<script>
  import { push } from 'svelte-spa-router'
</script>

<svelte:head>
  <title>404 — .batchrc</title>
</svelte:head>

<div class="page-wrapper not-found-page">
  <div class="card not-found-card">
    <p class="not-found-code" aria-hidden="true">404</p>
    <h1 class="text-section">Page not found</h1>
    <p class="text-caption" style="margin:0.5rem 0 1.5rem">The page you're looking for doesn't exist or has been moved.</p>
    <button class="btn btn-primary" on:click={() => push('/')}>Go home</button>
  </div>
</div>

<style>
  .not-found-page { display: flex; align-items: center; justify-content: center; min-height: calc(100vh - 60px); padding: 2rem; }
  .not-found-card { text-align: center; padding: 3rem; max-width: 420px; width: 100%; }
  .not-found-code { font-size: 6rem; font-weight: 700; color: var(--surface-border); line-height: 1; margin-bottom: 0.5rem; }
</style>
