<script>
  import { onMount } from 'svelte'
  import RouteGuard from '../components/RouteGuard.svelte'
  import SkillChip from '../components/SkillChip.svelte'
  import { getStudent, getProjects, getCerts, getAllSkills } from '../lib/firestore.js'
  import { user } from '../stores/auth.js'
  import { push } from 'svelte-spa-router'

  export let params = {}

  let student = null
  let projects = []
  let certs    = []
  let skillMap = {}
  let loading  = true
  let notFound = false
  let loadedUid = null

  async function loadProfile(uid) {
    if (!uid) { notFound = true; loading = false; return }
    loadedUid = uid
    loading = true
    notFound = false

    try {
      const [s, p, c, skills] = await Promise.all([
        getStudent(uid),
        getProjects(uid),
        getCerts(uid),
        getAllSkills(),
      ])
      if (!s) { notFound = true; loading = false; return }
      student  = s
      projects = p || []
      certs    = c || []
      skillMap = Object.fromEntries((skills || []).map(sk => [sk.id, sk.name]))
    } catch (e) {
      console.error('Error loading profile:', e)
      notFound = true
    } finally {
      loading = false
    }
  }

  $: if (params?.id && params.id !== loadedUid) {
    loadProfile(params.id)
  }

  onMount(() => {
    if (params?.id && params.id !== loadedUid) {
      loadProfile(params.id)
    }
  })

  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }

  $: isOwnProfile = $user && student && $user.uid === student.id
</script>

<svelte:head>
  <title>{student?.name || 'Student'} — Batch Portfolio</title>
  <meta name="description" content="{student?.name}'s profile — {student?.batch} 2025–27 batch." />
</svelte:head>

<RouteGuard requireAuth requireProfile>
  {#if loading}
    <div class="profile-loading page-wrapper">
      <div class="spinner" aria-label="Loading profile"></div>
    </div>
  {:else if notFound}
    <div class="page-wrapper not-found">
      <div class="card" style="text-align:center;padding:3rem">
        <p class="text-section" style="margin-bottom:0.5rem">Profile not found</p>
        <p class="text-caption" style="margin-bottom:1.5rem">This student profile doesn't exist yet.</p>
        <a href="/#/directory" class="btn btn-primary">Browse directory</a>
      </div>
    </div>
  {:else}
    <div class="profile-page page-wrapper">

      <!-- Left column -->
      <aside class="profile-aside">
        <div class="card aside-card">
          {#if student.photoURL}
            <img src={student.photoURL} alt="{student.name} photo" class="avatar profile-avatar" />
          {:else}
            <div class="avatar avatar-placeholder profile-avatar">{initials(student.name)}</div>
          {/if}

          <h1 class="text-section profile-name">{student.name}</h1>
          <span class="badge {student.batch === 'MCA' ? 'badge-mca' : 'badge-msc'}">{student.batch}</span>

          {#if student.bio}
            <p class="text-body profile-bio">{student.bio}</p>
          {/if}

          <!-- Links -->
          {#if student.links?.github || student.links?.linkedin || student.links?.portfolio}
            <div class="profile-links">
              {#if student.links.github}
                <a href={student.links.github} target="_blank" rel="noopener" class="link-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </a>
              {/if}
              {#if student.links.linkedin}
                <a href={student.links.linkedin} target="_blank" rel="noopener" class="link-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                  LinkedIn
                </a>
              {/if}
              {#if student.links.portfolio}
                <a href={student.links.portfolio} target="_blank" rel="noopener" class="link-btn">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
                  Portfolio
                </a>
              {/if}
            </div>
          {/if}

          <!-- Download Resume -->
          {#if student.resumeURL}
            <a
              href={student.resumeURL}
              target="_blank"
              rel="noopener"
              class="btn btn-primary btn-sm resume-btn"
              id="download-resume-btn"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Download Resume
            </a>
          {/if}

          {#if isOwnProfile}
            <a href="/#/edit" class="btn btn-ghost btn-sm" style="width:100%;justify-content:center">✏️ Edit profile</a>
          {/if}
        </div>
      </aside>

      <!-- Right column -->
      <main class="profile-main">

        <!-- Skills -->
        {#if (student.skillIds || []).length > 0}
          <section class="profile-section card">
            <h2 class="text-card section-title">Skills</h2>
            <div class="skills-wrap">
              {#each student.skillIds as sid}
                {#if skillMap[sid]}
                  <SkillChip name={skillMap[sid]} />
                {/if}
              {/each}
            </div>
          </section>
        {/if}

        <!-- Projects -->
        {#if projects.length > 0}
          <section class="profile-section card">
            <h2 class="text-card section-title">Projects</h2>
            <div class="projects-list">
              {#each projects as p}
                <div class="project-item">
                  <div class="project-header">
                    <h3 class="text-card">{p.title}</h3>
                    {#if p.link}
                      <a href={p.link} target="_blank" rel="noopener" class="btn btn-ghost btn-sm">↗ View</a>
                    {/if}
                  </div>
                  {#if p.description}<p class="text-body" style="margin-top:0.375rem">{p.description}</p>{/if}
                  {#if p.techUsed?.length}
                    <div class="tech-chips" style="margin-top:0.5rem">
                      {#each p.techUsed as t}
                        <span class="tech-chip">{t}</span>
                      {/each}
                    </div>
                  {/if}
                </div>
              {/each}
            </div>
          </section>
        {/if}

        <!-- Certifications -->
        {#if certs.length > 0}
          <section class="profile-section card">
            <h2 class="text-card section-title">Certifications</h2>
            <div class="certs-list">
              {#each certs as c}
                <div class="cert-item">
                  <div class="cert-header">
                    <div>
                      <p class="text-card">{c.title}</p>
                      <p class="text-caption">{c.issuer}{c.date ? ' · ' + c.date : ''}</p>
                    </div>
                    {#if c.link}
                      <a href={c.link} target="_blank" rel="noopener" class="btn btn-ghost btn-sm">View</a>
                    {/if}
                  </div>
                </div>
              {/each}
            </div>
          </section>
        {/if}

        {#if (student.skillIds || []).length === 0 && projects.length === 0 && certs.length === 0}
          <div class="card empty-profile">
            <p class="text-body" style="color:var(--text-secondary)">
              {isOwnProfile ? "You haven't added any details yet." : 'No details added yet.'}
            </p>
            {#if isOwnProfile}
              <a href="/#/edit" class="btn btn-primary btn-sm" style="margin-top:1rem">Fill in your profile</a>
            {/if}
          </div>
        {/if}

      </main>
    </div>
  {/if}
</RouteGuard>

<style>
  .profile-loading {
    display: flex; align-items: center; justify-content: center; min-height: 60vh;
  }
  .spinner {
    width: 40px; height: 40px; border: 3px solid var(--surface-border);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .not-found { padding: 4rem 1.5rem; max-width: 480px; }

  .profile-page {
    display: grid;
    grid-template-columns: 280px 1fr;
    gap: 1.5rem;
    padding: 2rem 1.5rem 4rem;
    align-items: start;
  }

  @media (max-width: 768px) {
    .profile-page { grid-template-columns: 1fr; }
  }

  .aside-card {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 0.75rem; position: sticky; top: 76px;
  }
  .profile-avatar { width: 96px; height: 96px; font-size: 2rem; }
  .profile-name { margin: 0; }
  .profile-bio { color: var(--text-secondary); margin-top: 0.25rem; }
  .profile-links { display: flex; flex-direction: column; gap: 0.5rem; width: 100%; }
  .link-btn {
    display: flex; align-items: center; gap: 0.5rem;
    padding: 0.4rem 0.875rem; border-radius: 0.5rem;
    background: var(--bg); border: 1px solid var(--surface-border);
    color: var(--text-primary); font-size: 0.875rem; font-weight: 500;
    text-decoration: none; transition: border-color 0.15s;
    justify-content: center;
  }
  .link-btn:hover { border-color: var(--accent); color: var(--accent); text-decoration: none; }

  .resume-btn {
    width: 100%;
    justify-content: center;
    gap: 0.5rem;
    text-decoration: none;
    margin-top: 0.25rem;
  }
  .resume-btn:hover { text-decoration: none; }

  .profile-main { display: flex; flex-direction: column; gap: 1.25rem; }
  .profile-section { padding: 1.5rem; }
  .section-title { margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
  .skills-wrap { display: flex; flex-wrap: wrap; gap: 0.5rem; }

  .projects-list { display: flex; flex-direction: column; gap: 1.25rem; }
  .project-item { padding-bottom: 1.25rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
  .project-item:last-child { border-bottom: none; padding-bottom: 0; }
  .project-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .tech-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
  .tech-chip {
    padding: 0.2rem 0.6rem; border-radius: 999px;
    font-size: 0.75rem; font-weight: 500;
    background: var(--bg);
    box-shadow: var(--shadow-neu-inset-sm);
    color: var(--text-secondary);
  }

  .certs-list { display: flex; flex-direction: column; gap: 1rem; }
  .cert-item { padding-bottom: 1rem; border-bottom: 1px solid rgba(0,0,0,0.06); }
  .cert-item:last-child { border-bottom: none; padding-bottom: 0; }
  .cert-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 0.5rem; }

  @media (prefers-color-scheme: dark) {
    .section-title,
    .project-item,
    .cert-item {
      border-bottom-color: rgba(255, 255, 255, 0.08);
    }
  }

  .empty-profile { padding: 2rem; text-align: center; }
</style>
