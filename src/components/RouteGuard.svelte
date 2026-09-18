<script>
  import { get } from 'svelte/store'
  import { user, authReady, userRole } from '../stores/auth.js'
  import { hasProfile, studentLoaded } from '../stores/student.js'
  import { push, location } from 'svelte-spa-router'
  import { onMount } from 'svelte'

  export let requireAuth      = false
  export let requireProfile   = false
  export let requireNoProfile = false

  let checked = false

  $: if ($authReady) {
    if (!$user) {
      if (requireAuth) {
        push('/login')
      } else {
        checked = true
      }
    } else if ($studentLoaded) {
      const loc = $location
      let redirect = false
      
      if (!$userRole) {
        if (loc !== '/create-profile') { push('/create-profile'); redirect = true }
      } else if ($userRole === 'student') {
        if (requireProfile && !$hasProfile) {
          push('/create-profile')
          redirect = true
        } else if (requireNoProfile && $hasProfile) {
          push('/directory')
          redirect = true
        }
      } else if ($userRole === 'viewer') {
        if (loc === '/create-profile' || loc === '/edit') {
          push('/directory')
          redirect = true
        }
      }
      
      if (!redirect) checked = true
    }
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
