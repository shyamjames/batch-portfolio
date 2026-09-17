<script>
  import { onMount } from 'svelte'

  let toasts = []
  let id = 0

  export function showToast(message, type = 'info', duration = 4000) {
    const toast = { id: id++, message, type }
    toasts = [...toasts, toast]
    setTimeout(() => {
      toasts = toasts.filter(t => t.id !== toast.id)
    }, duration)
  }

  // Expose globally
  onMount(() => {
    window.__showToast = showToast
  })
</script>

<div class="toast-container" aria-live="polite">
  {#each toasts as toast (toast.id)}
    <div class="toast toast-{toast.type}" role="alert">
      <span class="toast-icon">
        {#if toast.type === 'success'}✅{:else if toast.type === 'error'}❌{:else}ℹ️{/if}
      </span>
      {toast.message}
    </div>
  {/each}
</div>

<style>
  .toast-container {
    position: fixed;
    bottom: 1.5rem;
    right: 1.5rem;
    z-index: 9999;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    pointer-events: none;
  }
  .toast {
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: 0.75rem;
    padding: 0.75rem 1.25rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.9rem;
    font-weight: 500;
    box-shadow: var(--shadow-ambient);
    animation: slideIn 0.25s ease-out;
    pointer-events: all;
  }
  .toast-success { border-color: #16a34a; }
  .toast-error   { border-color: var(--danger, #dc2626); }
  .toast-icon    { font-size: 1rem; }

  @keyframes slideIn {
    from { transform: translateX(120%); opacity: 0; }
    to   { transform: translateX(0);    opacity: 1; }
  }
</style>
