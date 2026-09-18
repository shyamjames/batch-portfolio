<script>
  import { onMount } from 'svelte'
  import { user, userRole, authReady } from '../stores/auth.js'
  import { setUserRole } from '../lib/firestore.js'
  import { push, replace } from 'svelte-spa-router'
  import { get } from 'svelte/store'

  let saving = false
  let error = ''

  onMount(() => {
    // If they already have a role, they shouldn't be here
    const unsub = authReady.subscribe(ready => {
      if (ready && get(userRole)) {
        unsub()
        replace('/directory')
      } else if (ready && !get(user)) {
        unsub()
        replace('/login')
      }
    })
    return unsub
  })

  async function selectRole(role) {
    if (!$user || saving) return
    saving = true
    error = ''
    try {
      await setUserRole($user.uid, role)
      userRole.set(role) // Update local store immediately
      if (role === 'student') {
        replace('/create-profile')
      } else {
        replace('/directory')
      }
    } catch (e) {
      console.error('Role save error:', e)
      error = 'Failed to save your selection. Please try again.'
      saving = false
    }
  }
</script>

<svelte:head>
  <title>Welcome — .batchrc</title>
</svelte:head>

<div class="onboarding-page page-wrapper">
  <div class="onboarding-card card">
    <h1 class="text-section" style="text-align:center;margin-bottom:0.5rem">Welcome!</h1>
    <p class="text-caption" style="text-align:center;margin-bottom:2rem">How will you be using .batchrc?</p>

    <div class="role-options">
      <!-- Student Option -->
      <button 
        class="role-card" 
        on:click={() => selectRole('student')}
        disabled={saving}
      >
        <div class="role-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z"/>
            <path d="M6 12v5c3 3 9 3 12 0v-5"/>
          </svg>
        </div>
        <div class="role-text">
          <h3 class="text-card">I am a Student</h3>
          <p class="text-caption">I want to create my profile and appear in the batch directory.</p>
        </div>
      </button>

      <!-- Recruiter / Viewer Option -->
      <button 
        class="role-card" 
        on:click={() => selectRole('viewer')}
        disabled={saving}
      >
        <div class="role-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
        <div class="role-text">
          <h3 class="text-card">I am a Recruiter / Viewer</h3>
          <p class="text-caption">I just want to browse the directory and view student profiles.</p>
        </div>
      </button>
    </div>

    {#if error}
      <p class="error-msg">{error}</p>
    {/if}
  </div>
</div>

<style>
  .onboarding-page {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: calc(100vh - 60px);
    padding: 2rem 1rem;
  }
  .onboarding-card {
    width: 100%;
    max-width: 560px;
    padding: 3rem 2.5rem;
  }
  .role-options {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  .role-card {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    padding: 1.5rem;
    background: var(--bg);
    border: 1px solid var(--surface-border);
    border-radius: 0.75rem;
    cursor: pointer;
    text-align: left;
    transition: all 0.2s ease;
    width: 100%;
    color: var(--text-primary);
  }
  .role-card:hover:not(:disabled) {
    border-color: var(--accent);
    background: var(--accent-soft);
    transform: translateY(-2px);
  }
  .role-card:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  .role-icon {
    flex-shrink: 0;
    color: var(--accent);
    background: var(--surface);
    width: 56px;
    height: 56px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    border: 1px solid var(--surface-border);
  }
  .role-text h3 { margin-bottom: 0.25rem; }
  .error-msg { color: var(--danger, #dc2626); font-size: 0.875rem; margin-top: 1.5rem; text-align: center; }
</style>
