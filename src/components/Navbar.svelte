<script>
  import { user, authReady, userRole } from '../stores/auth.js'
  import { hasProfile, currentStudent } from '../stores/student.js'
  import { signOut, deleteUserAccount } from '../lib/auth.js'
  import { deleteAccountData } from '../lib/firestore.js'
  import { toggleTheme, isDark } from '../lib/theme.js'
  import { push } from 'svelte-spa-router'

  let dark = isDark()
  let dropdownOpen = false
  let deleting = false

  function toggleDropdown() {
    dropdownOpen = !dropdownOpen
  }

  // Close dropdown if clicked outside
  function handleBodyClick(e) {
    if (!e.target.closest('.user-menu-container')) {
      dropdownOpen = false
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to completely delete your account? This action cannot be undone.')) return
    
    deleting = true
    try {
      await deleteAccountData($user.uid)
      await deleteUserAccount()
      window.__showToast?.('Account deleted successfully', 'success')
      push('/')
    } catch (e) {
      console.error('Delete account error:', e)
      window.__showToast?.(e.message || 'Failed to delete account. You may need to sign out and sign in again first.', 'error')
    } finally {
      deleting = false
      dropdownOpen = false
    }
  }

  function handleToggle() {
    toggleTheme()
    dark = isDark()
  }

  async function handleSignOut() {
    await signOut()
    push('/')
  }
</script>

<svelte:window on:click={handleBodyClick} />

<header class="navbar">
  <div class="page-wrapper navbar-inner">
    <a href="/#/" class="brand">
      <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
        <rect width="28" height="28" rx="7" fill="var(--accent)"/>
        <text x="14" y="19" text-anchor="middle" font-size="12" font-weight="700" fill="white" font-family="'Geist Mono', monospace">.rc</text>
      </svg>
      <span class="brand-text">.batchrc</span>
    </a>

    <a href="/#/directory" class="nav-link directory-link">Directory</a>

    <nav class="nav-links">
      {#if $authReady && $user}
        
        <div class="user-menu-container" style="position:relative;margin-left:0.5rem">
          <button class="avatar-btn" on:click={toggleDropdown} aria-label="User menu">
            {#if $currentStudent?.photoURL}
              <img src={$currentStudent.photoURL} alt="Avatar" class="avatar-img" />
            {:else if $user.photoURL}
              <img src={$user.photoURL} alt="Avatar" class="avatar-img" />
            {:else}
              <div class="avatar-initial">{$user.displayName ? $user.displayName[0].toUpperCase() : 'U'}</div>
            {/if}
          </button>
          
          {#if dropdownOpen}
            <div class="dropdown-menu">
              <div class="dropdown-header">
                <span style="font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{$user.displayName || 'User'}</span>
                <span class="text-caption" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">{$user.email}</span>
              </div>

              {#if $userRole === 'student'}
                {#if $hasProfile}
                  <button class="dropdown-item" on:click={() => { push(`/profile/${$user.uid}`); dropdownOpen = false }}>My Profile</button>
                  <button class="dropdown-item" on:click={() => { push('/edit'); dropdownOpen = false }}>Edit Profile</button>
                {:else}
                  <button class="dropdown-item" on:click={() => { push('/create-profile'); dropdownOpen = false }}>Create Profile</button>
                {/if}
                <div class="dropdown-divider"></div>
              {/if}

              {#if $userRole === 'admin'}
                <button class="dropdown-item" on:click={() => { push('/admin'); dropdownOpen = false }}>Admin Panel</button>
                <div class="dropdown-divider"></div>
              {/if}
              <button class="dropdown-item" on:click={handleSignOut}>Sign out</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item danger" disabled={deleting} on:click={handleDeleteAccount}>
                {deleting ? 'Deleting...' : 'Delete Account'}
              </button>
            </div>
          {/if}
        </div>
        
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
    top: 1.5rem;
    z-index: 100;
    background: var(--surface);
    box-shadow: var(--shadow-neu);
    margin: 1.5rem auto 2rem;
    border-radius: 999px;
    max-width: 1280px;
    width: calc(100% - 3rem);
    transition: all 0.2s ease;
  }
  .navbar-inner {
    display: flex;
    align-items: center;
    gap: 1rem;
    height: 60px;
    padding: 0 1.5rem;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    font-size: 1.05rem;
    color: var(--text-primary);
    text-decoration: none;
    flex-shrink: 0;
  }
  .brand-text {
    font-family: 'Geist Mono', monospace;
    font-weight: 700;
    letter-spacing: -0.03em;
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
  .directory-link {
    font-weight: 600;
    margin-left: 0.75rem;
  }
  .theme-toggle {
    background: var(--surface);
    border: none;
    border-radius: 0.5rem;
    width: 36px;
    height: 36px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--text-secondary);
    box-shadow: var(--shadow-neu-sm);
    transition: all 0.15s;
    flex-shrink: 0;
  }
  .theme-toggle:hover { box-shadow: var(--shadow-neu-inset-sm); color: var(--primary); }

  /* User Menu */
  .avatar-btn {
    width: 40px;
    height: 40px;
    border-radius: 50%;
    border: 3px solid var(--surface);
    box-shadow: var(--shadow-neu-sm);
    padding: 0;
    cursor: pointer;
    overflow: hidden;
    background: var(--surface);
    display: flex;
    align-items: center;
    justify-content: center;
    transition: box-shadow 0.15s;
  }
  .avatar-btn:hover { box-shadow: var(--shadow-neu-inset-sm); }
  .avatar-img { width: 100%; height: 100%; object-fit: cover; }
  .avatar-initial { font-weight: 600; font-size: 1rem; color: var(--primary); }
  
  .dropdown-menu {
    position: absolute;
    top: calc(100% + 12px);
    right: 0;
    width: 240px;
    background: var(--surface);
    border-radius: 1rem;
    box-shadow: var(--shadow-neu-hover);
    padding: 0.5rem 0;
    z-index: 200;
  }
  .dropdown-header {
    padding: 0.75rem 1rem;
    border-bottom: 2px solid transparent;
    box-shadow: 0 4px 6px -6px rgba(0,0,0,0.1);
    margin-bottom: 0.5rem;
  }
  .dropdown-item {
    display: block;
    width: 100%;
    text-align: left;
    padding: 0.6rem 1rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--text-primary);
    background: none;
    border: none;
    cursor: pointer;
    transition: color 0.1s;
  }
  .dropdown-item:hover { color: var(--primary); }
  .dropdown-item.danger { color: var(--danger, #dc2626); }
  .dropdown-item.danger:hover { background: rgba(220, 38, 38, 0.1); }
  .dropdown-item:disabled { opacity: 0.5; cursor: not-allowed; }
  .dropdown-divider { height: 1px; background: var(--surface-border); margin: 0.25rem 0; }

  @media (max-width: 640px) {
    .nav-link { display: none; }
  }
</style>
