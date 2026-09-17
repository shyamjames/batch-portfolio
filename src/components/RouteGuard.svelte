<script>
  import { get } from 'svelte/store'
  import { user, authReady } from '../stores/auth.js'
  import { hasProfile } from '../stores/student.js'
  import { push } from 'svelte-spa-router'
  import { onMount } from 'svelte'

  export let requireAuth      = false
  export let requireProfile   = false
  export let requireNoProfile = false

  let checked = false

  onMount(() => {
    // Wait for auth to settle, then check
    if (get(authReady)) {
      doCheck()
    } else {
      const unsub = authReady.subscribe(ready => {
        if (ready) { unsub(); doCheck() }
      })
    }
  })

  function doCheck() {
    const $u  = get(user)
    const $hp = get(hasProfile)

    if (requireAuth && !$u) {
      push('/login')
      return
    }
    if (requireProfile && $u && !$hp) {
      push('/create-profile')
      return
    }
    if (requireNoProfile && $u && $hp) {
      push('/directory')
      return
    }
    checked = true
  }
</script>

{#if checked}
  <slot />
{:else}
  <div class="guard-loading">
    <div class="spinner"></div>
  </div>
{/if}

<style>
  .guard-loading {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 60vh;
  }
  .spinner {
    width: 40px;
    height: 40px;
    border: 3px solid var(--surface-border);
    border-top-color: var(--accent);
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
