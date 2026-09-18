<script>
  import { onMount } from 'svelte'
  import RouteGuard from '../components/RouteGuard.svelte'
  import { getAllStudents, deleteAccountData, getAllSkills, deleteSkill } from '../lib/firestore.js'
  import { userRole } from '../stores/auth.js'
  import { push } from 'svelte-spa-router'
  import { ensureSkillsLoaded } from '../stores/skills.js'

  let students = []
  let skills = []
  let loading = true
  let activeTab = 'students' // 'students' | 'skills'

  onMount(async () => {
    // Basic protection: must be admin
    const unsub = userRole.subscribe(role => {
      if (role !== null && role !== 'admin') {
        push('/')
      }
    })
    
    if ($userRole === 'admin') {
      await loadData()
    }
    
    return unsub
  })

  async function loadData() {
    loading = true
    try {
      const [s, sk] = await Promise.all([
        getAllStudents(),
        getAllSkills()
      ])
      students = s.sort((a, b) => a.name.localeCompare(b.name))
      skills = sk.sort((a, b) => a.name.localeCompare(b.name))
    } catch (e) {
      console.error("Admin load error:", e)
      alert("Failed to load admin data: " + e.message)
    } finally {
      loading = false
    }
  }

  async function handleDeleteStudent(uid, name) {
    if (!confirm(`Are you sure you want to completely delete ${name}'s profile and all their data? This cannot be undone.`)) return
    
    try {
      await deleteAccountData(uid)
      students = students.filter(s => s.id !== uid)
      if (window.__showToast) window.__showToast("Student deleted", "success")
    } catch (e) {
      console.error(e)
      alert("Failed to delete student: " + e.message)
    }
  }

  async function handleDeleteSkill(skillId, name) {
    if (!confirm(`Are you sure you want to delete the skill "${name}" globally?`)) return
    
    try {
      await deleteSkill(skillId)
      skills = skills.filter(s => s.id !== skillId)
      await ensureSkillsLoaded(true) // Force cache refresh
      if (window.__showToast) window.__showToast("Skill deleted", "success")
    } catch (e) {
      console.error(e)
      alert("Failed to delete skill: " + e.message)
    }
  }

  async function handleRecalculateStats() {
    try {
      let mca = 0, msc = 0
      students.forEach(s => {
        if (s.batch === 'MCA') mca++
        if (s.batch === 'MSc CS') msc++
      })
      const { doc, setDoc } = await import('firebase/firestore')
      const { db } = await import('../lib/firebase.js')
      await setDoc(doc(db, 'meta', 'aggregates'), {
        mcaCount: mca,
        mscCount: msc
      })
      if (window.__showToast) window.__showToast("Stats recalculated successfully!", "success")
    } catch (e) {
      console.error(e)
      alert("Failed to recalculate stats: " + e.message)
    }
  }

</script>

<svelte:head>
  <title>Admin Dashboard — Batch Portfolio</title>
</svelte:head>

<RouteGuard requireAuth>
  <div class="admin-page page-wrapper">
    <div class="card header-card" style="position: relative;">
      <h1 class="text-section">Admin Dashboard</h1>
      <p class="text-caption">Manage students and global skills</p>
      <button class="btn btn-ghost btn-sm" style="position: absolute; top: 1rem; right: 1rem;" on:click={handleRecalculateStats}>
        Recalculate Stats
      </button>
    </div>

    {#if loading}
      <div class="spinner-wrap">
        <div class="spinner"></div>
      </div>
    {:else}
      <div class="tabs">
        <button class="tab-btn {activeTab === 'students' ? 'active' : ''}" on:click={() => activeTab = 'students'}>
          Students ({students.length})
        </button>
        <button class="tab-btn {activeTab === 'skills' ? 'active' : ''}" on:click={() => activeTab = 'skills'}>
          Skills ({skills.length})
        </button>
      </div>

      <div class="card content-card">
        {#if activeTab === 'students'}
          <div class="list-wrap">
            {#each students as s}
              <div class="list-item">
                <div class="item-info">
                  <strong>{s.name}</strong>
                  <span class="badge {s.batch === 'MCA' ? 'badge-mca' : 'badge-msc'}">{s.batch}</span>
                </div>
                <button class="btn btn-danger btn-sm" on:click={() => handleDeleteStudent(s.id, s.name)}>Delete</button>
              </div>
            {:else}
              <p class="text-body empty-text">No students found.</p>
            {/each}
          </div>
        {:else if activeTab === 'skills'}
          <div class="list-wrap">
            {#each skills as sk}
              <div class="list-item">
                <div class="item-info">
                  <strong>{sk.name}</strong>
                  <span class="text-caption">Uses: {sk.usageCount || 0}</span>
                </div>
                <button class="btn btn-danger btn-sm" on:click={() => handleDeleteSkill(sk.id, sk.name)}>Delete</button>
              </div>
            {:else}
              <p class="text-body empty-text">No skills found.</p>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</RouteGuard>

<style>
  .admin-page { display: flex; flex-direction: column; gap: 1.5rem; padding: 2rem 1.5rem; max-width: 800px; margin: 0 auto; }
  .header-card { text-align: center; padding: 2rem; }
  .spinner-wrap { display: flex; justify-content: center; padding: 4rem 0; }
  .spinner {
    width: 40px; height: 40px; border: 3px solid var(--surface-border);
    border-top-color: var(--accent); border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  .tabs { display: flex; gap: 0.5rem; margin-bottom: 0.5rem; }
  .tab-btn {
    flex: 1; padding: 0.75rem; background: var(--bg); border: 1px solid var(--surface-border);
    border-radius: 0.5rem; cursor: pointer; color: var(--text-secondary); font-weight: 600;
    transition: all 0.2s;
  }
  .tab-btn:hover { background: var(--accent-soft); color: var(--accent); }
  .tab-btn.active { background: var(--accent); color: white; border-color: var(--accent); }

  .content-card { padding: 1.5rem; }
  .list-wrap { display: flex; flex-direction: column; gap: 0.75rem; }
  .list-item {
    display: flex; justify-content: space-between; align-items: center;
    padding: 1rem; border: 1px solid var(--surface-border); border-radius: 0.5rem;
    background: var(--bg);
  }
  .item-info { display: flex; align-items: center; gap: 1rem; }
  .empty-text { text-align: center; color: var(--text-secondary); padding: 2rem 0; }
</style>
