<script>
  import { user, authReady } from '../stores/auth.js'
  import { hasProfile } from '../stores/student.js'
  import { signOut } from '../lib/auth.js'
  import { toggleTheme, isDark } from '../lib/theme.js'
  import { push } from 'svelte-spa-router'

  let dark = isDark()

  function handleToggle() {
    toggleTheme()
    dark = isDark()
  }

  async function handleSignOut() {
    await signOut()
    push('/')
  }
</script>

<header class="navbar">
  <div class="page-wrapper navbar-inner">
    <a href="/#/" class="brand">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="var(--accent)"/>
        <text x="14" y="20" text-anchor="middle" font-size="14" font-weight="700" fill="white" font-family="Inter,sans-serif">BP</text>
      </svg>
      <span>Batch Portfolio</span>
    </a>

    <nav class="nav-links">
      {#if $authReady && $user}
        {#if $hasProfile}
          <a href="/#/directory" class="nav-link">Directory</a>
          <a href="/#/profile/{$user.uid}" class="nav-link">My Profile</a>
          <a href="/#/edit" class="nav-link">Edit</a>
        {/if}
        <button class="btn btn-ghost btn-sm" on:click={handleSignOut}>Sign out</button>
      {:else if $authReady}
        <a href="/#/login" class="btn btn-primary btn-sm">Sign in</a>
      {/if}
    </nav>

    <button class="theme-toggle" on:click={handleToggle} aria-label="Toggle theme" title="Toggle theme">
      {#if dark}
        <!-- Sun -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      {:else}
        <!-- Moon -->
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      {/if}
    </button>
  </div>
</header>

<style>
  .navbar {
    position: sticky;
    top: 0;
    z-index: 100;
    background: var(--surface);
    border-bottom: 1px solid var(--surface-border);
    backdrop-filter: blur(12px);
  }
  .navbar-inner {
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 60px;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1rem;
    color: var(--text-primary);
    text-decoration: none;
    flex-shrink: 0;
  }
  .brand:hover { text-decoration: none; opacity: 0.85; }
  .nav-links {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-left: auto;
    margin-right: 0.5rem;
  }
  .nav-link {
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--text-secondary);
    text-decoration: none;
    transition: color 0.15s;
  }
  .nav-link:hover { color: var(--text-primary); text-decoration: none; }
  .theme-toggle {
    background: none;
    border: 1px solid var(--surface-border);
    border-radius: 0.5rem;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    transition: border-color 0.15s, color 0.15s;
    flex-shrink: 0;
  }
  .theme-toggle:hover { border-color: var(--accent); color: var(--accent); }

  @media (max-width: 640px) {
    .nav-link { display: none; }
  }
</style>
