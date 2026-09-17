<script>
  import { onMount } from 'svelte'
  import RouteGuard from '../components/RouteGuard.svelte'
  import ProfileForm from '../components/ProfileForm.svelte'
  import { getStudent, updateStudent, getProjects, getCerts, addProject, addCert } from '../lib/firestore.js'
  import { user } from '../stores/auth.js'
  import { currentStudent, loadCurrentStudent } from '../stores/student.js'
  import { push } from 'svelte-spa-router'

  let initial = null
  let loading  = true
  let saving   = false

  onMount(async () => {
    if (!$user) return
    const [student, projects, certs] = await Promise.all([
      getStudent($user.uid),
      getProjects($user.uid),
      getCerts($user.uid),
    ])
    initial = { ...student, projects, certs }
    loading = false
  })

  async function handleSave(formData) {
    if (!$user) return
    const { projects, certs, ...studentData } = formData
    await updateStudent($user.uid, studentData)

    // Re-sync projects and certs (simple approach: add new ones)
    const existingProjects = await getProjects($user.uid)
    for (const p of projects) {
      if (!p.id) await addProject($user.uid, p)
    }
    const existingCerts = await getCerts($user.uid)
    for (const c of certs) {
      if (!c.id) await addCert($user.uid, c)
    }

    await loadCurrentStudent($user.uid)
    window.__showToast?.('Profile updated!', 'success')
    push(`/profile/${$user.uid}`)
  }
</script>

<svelte:head>
  <title>Edit Profile — Batch Portfolio</title>
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
