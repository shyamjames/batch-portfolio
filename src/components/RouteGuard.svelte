<script>
  import { user, authReady } from '../stores/auth.js'
  import { hasProfile, currentStudent } from '../stores/student.js'
  import { push } from 'svelte-spa-router'
  import { onMount } from 'svelte'

  export let requireAuth = false
  export let requireProfile = false
  export let requireNoProfile = false   // for /create-profile: redirect away if profile exists

  let checked = false

  onMount(async () => {
    // Wait for auth to settle
    await waitForAuthReady()
    doCheck()
  })

  function waitForAuthReady() {
    return new Promise(resolve => {
      const unsub = authReady.subscribe(ready => {
        if (ready) { unsub(); resolve() }
      })
    })
  }

  function doCheck() {
    const $user = $user_val
    const $hp   = $hasProfile_val

    if (requireAuth && !$user) {
      push('/login')
      return
    }
    if (requireProfile && $user && !$hp) {
      push('/create-profile')
      return
    }
    if (requireNoProfile && $user && $hp) {
      push('/directory')
      return
    }
    checked = true
  }

  let $user_val
  let $hasProfile_val

  user.subscribe(v => { $user_val = v })
  hasProfile.subscribe(v => { $hasProfile_val = v })

  // Re-check if store values change
  $: if ($authReady) doCheck()
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
