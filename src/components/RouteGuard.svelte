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

  onMount(() => {
    // Wait for auth to settle
    const unsubAuth = authReady.subscribe(ready => {
      if (ready) {
        // If logged in, wait for student doc check too
        if (get(user)) {
          let unsubStudent
          unsubStudent = studentLoaded.subscribe(sLoaded => {
            if (sLoaded) {
              if (unsubStudent) unsubStudent()
              else setTimeout(() => unsubStudent && unsubStudent(), 0)
              doCheck()
            }
          })
        } else {
          doCheck()
        }
      }
    })
    return unsubAuth
  })

  function doCheck() {
    const $u  = get(user)
    const $ur = get(userRole)
    const $hp = get(hasProfile)
    const currentLoc = get(location)

    if (requireAuth && !$u) {
      push('/login')
      return
    }

    if ($u) {
      // Role selection
      if (!$ur) {
        if (currentLoc !== '/onboarding') push('/onboarding')
        return
      }

      // Role-specific routing
      if ($ur === 'student') {
        if (requireProfile && !$hp) {
          push('/create-profile')
          return
        }
        if (requireNoProfile && $hp) {
          push('/directory')
          return
        }
      } else if ($ur === 'viewer') {
        // Viewers don't have profiles. Block them from profile creation/editing.
        if (currentLoc === '/create-profile' || currentLoc === '/edit') {
          push('/directory')
          return
        }
      }
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
