<script>
  import RouteGuard from '../components/RouteGuard.svelte'
  import ProfileForm from '../components/ProfileForm.svelte'
  import { createStudent, addProject, addCert, getAllSkills } from '../lib/firestore.js'
  import { user } from '../stores/auth.js'
  import { currentStudent, loadCurrentStudent } from '../stores/student.js'
  import { push } from 'svelte-spa-router'

  let saving = false

  async function handleSave(formData) {
    if (!$user) return
    const { projects = [], certs = [], ...studentData } = formData
    await createStudent($user.uid, { ...studentData, skillIds: studentData.skillIds || [] })

    // Add sub-collections
    for (const p of projects) {
      const { id, createdAt, ...pData } = p
      await addProject($user.uid, pData)
    }
    for (const c of certs) {
      const { id, createdAt, ...cData } = c
      await addCert($user.uid, cData)
    }

    await loadCurrentStudent($user.uid)
    window.__showToast?.('🎉 Your profile is live!', 'success', 6000)
    push(`/profile/${$user.uid}`)
  }
</script>

<svelte:head>
  <title>Create Profile — Batch Portfolio</title>
  <meta name="description" content="Set up your student profile for the 2025–27 batch directory." />
</svelte:head>

<RouteGuard requireAuth requireNoProfile>
  <div class="page-wrapper create-page">
    <header class="page-header">
      <h1 class="text-section">Create your profile</h1>
      <p class="text-caption">Fill in your details to appear in the batch directory.</p>
    </header>
    <div class="form-container card">
      <ProfileForm mode="create" onSave={handleSave} bind:saving />
    </div>
  </div>
</RouteGuard>

<style>
  .create-page { padding: 2rem 1.5rem 4rem; max-width: 720px; }
  .page-header { margin-bottom: 1.75rem; }
  .form-container { padding: 2rem; }
</style>
