<script>
  import { onMount } from 'svelte'
  import RouteGuard from '../components/RouteGuard.svelte'
  import ProfileForm from '../components/ProfileForm.svelte'
  import { 
    getStudent, 
    updateStudent, 
    getProjects, 
    getCerts, 
    addProject, 
    updateProject, 
    deleteProject, 
    addCert, 
    updateCert, 
    deleteCert 
  } from '../lib/firestore.js'
  import { user } from '../stores/auth.js'
  import { currentStudent, loadCurrentStudent } from '../stores/student.js'
  import { push } from 'svelte-spa-router'

  let initial = null
  let loading  = true
  let saving   = false
  let loadedUid = null

  async function loadData(uid) {
    if (!uid || loadedUid === uid) return
    loadedUid = uid
    loading = true
    try {
      const [student, projects, certs] = await Promise.all([
        getStudent(uid),
        getProjects(uid),
        getCerts(uid),
      ])
      initial = { ...student, projects: projects || [], certs: certs || [] }
    } catch (e) {
      console.error('Failed to load student data for edit:', e)
    } finally {
      loading = false
    }
  }

  $: if ($user && (!initial || loadedUid !== $user.uid)) {
    loadData($user.uid)
  }

  onMount(() => {
    if ($user && (!initial || loadedUid !== $user.uid)) {
      loadData($user.uid)
    }
  })

  async function handleSave(formData) {
    if (!$user) return
    const { projects = [], certs = [], ...studentData } = formData
    await updateStudent($user.uid, studentData)

    // Sync projects
    const existingProjects = await getProjects($user.uid)
    const currentProjectIds = new Set(projects.filter(p => p.id).map(p => p.id))
    
    // 1. Delete projects that were removed in the form
    for (const ep of existingProjects) {
      if (!currentProjectIds.has(ep.id)) {
        await deleteProject($user.uid, ep.id)
      }
    }
    // 2. Add or update projects
    for (const p of projects) {
      const { id, createdAt, ...pData } = p
      if (!id) {
        await addProject($user.uid, pData)
      } else {
        await updateProject($user.uid, id, pData)
      }
    }

    // Sync certs
    const existingCerts = await getCerts($user.uid)
    const currentCertIds = new Set(certs.filter(c => c.id).map(c => c.id))
    
    // 1. Delete certs that were removed in the form
    for (const ec of existingCerts) {
      if (!currentCertIds.has(ec.id)) {
        await deleteCert($user.uid, ec.id)
      }
    }
    // 2. Add or update certs
    for (const c of certs) {
      const { id, createdAt, ...cData } = c
      if (!id) {
        await addCert($user.uid, cData)
      } else {
        await updateCert($user.uid, id, cData)
      }
    }

    await loadCurrentStudent($user.uid)
    window.__showToast?.('Profile updated!', 'success')
    push(`/profile/${$user.uid}`)
  }
</script>

<svelte:head>
  <title>Edit Profile — .batchrc</title>
  <meta name="description" content="Update your student profile details." />
</svelte:head>

<RouteGuard requireAuth requireProfile>
  <div class="page-wrapper edit-page">
    <header class="page-header">
      <h1 class="text-section">Edit your profile</h1>
      <p class="text-caption">Changes are saved to your profile immediately.</p>
    </header>

    {#if loading}
      <div class="card" style="padding:2rem">
        <div class="skeleton" style="height:200px;border-radius:0.5rem"></div>
      </div>
    {:else if initial}
      <div class="form-container card">
        <ProfileForm mode="edit" {initial} onSave={handleSave} bind:saving />
      </div>
    {/if}
  </div>
</RouteGuard>

<style>
  .edit-page { padding: 2rem 1.5rem 4rem; max-width: 720px; }
  .page-header { margin-bottom: 1.75rem; }
  .form-container { padding: 2rem; }
</style>
