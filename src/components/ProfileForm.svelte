<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import SkillChip from './SkillChip.svelte'
  import { allSkills, ensureSkillsLoaded } from '../stores/skills.js'
  import { addSkillToStudent, createAndAddSkill, removeSkillFromStudent } from '../lib/firestore.js'
  import { uploadPhoto } from '../lib/storage.js'
  import { user } from '../stores/auth.js'

  export let mode = 'create'    // 'create' | 'edit'
  export let initial = {}       // initial data for edit mode
  export let onSave = null      // async (formData) => void
  export let saving = false

  // Form fields
  let name       = initial.name       || ''
  let bio        = initial.bio        || ''
  let batch      = initial.batch      || ''
  let github     = initial.links?.github     || ''
  let linkedin   = initial.links?.linkedin   || ''
  let portfolio  = initial.links?.portfolio  || ''
  let photoFile  = null
  let photoPreview = initial.photoURL || null

  // Skills
  let skillIds   = [...(initial.skillIds || [])]
  let skillMap   = {}           // skillId -> name
  let skillQuery = ''
  let suggestions = []
  let showSuggestions = false

  // Projects
  let projects = [...(initial.projects || [])]
  let newProject = emptyProject()

  // Certs
  let certs = [...(initial.certs || [])]
  let newCert = emptyCert()

  // Errors
  let errors = {}

  onMount(async () => {
    await ensureSkillsLoaded()
    // Build skillMap from store
    const skills = get(allSkills)
    skillMap = Object.fromEntries(skills.map(s => [s.id, s.name]))
  })

  function emptyProject() {
    return { title: '', description: '', techUsed: '', link: '' }
  }
  function emptyCert() {
    return { title: '', issuer: '', date: '', link: '' }
  }

  // Skill autocomplete
  function handleSkillInput() {
    if (!skillQuery.trim()) { suggestions = []; showSuggestions = false; return }
    const all = get(allSkills)
    const q = skillQuery.toLowerCase()
    suggestions = all.filter(s =>
      !skillIds.includes(s.id) &&
      (s.nameLower || s.name.toLowerCase()).includes(q)
    ).slice(0, 8)
    showSuggestions = true
  }

  async function selectSkill(skill) {
    if (!$user) return
    await addSkillToStudent($user.uid, skill.id)
    skillIds = [...skillIds, skill.id]
    skillMap[skill.id] = skill.name
    skillQuery = ''
    suggestions = []
    showSuggestions = false
  }

  async function createSkill() {
    if (!skillQuery.trim() || !$user) return
    const uid = await createAndAddSkill($user.uid, skillQuery.trim())
    skillIds = [...skillIds, uid]
    skillMap[uid] = skillQuery.trim()
    // Refresh skills store
    await ensureSkillsLoaded()
    skillQuery = ''
    suggestions = []
    showSuggestions = false
  }

  async function removeSkill(skillId) {
    if (!$user) return
    await removeSkillFromStudent($user.uid, skillId)
    skillIds = skillIds.filter(id => id !== skillId)
  }

  // Photo
  function handlePhoto(e) {
    photoFile = e.target.files[0]
    if (photoFile) {
      photoPreview = URL.createObjectURL(photoFile)
    }
  }

  // Project list
  function addProject() {
    if (!newProject.title.trim()) return
    projects = [...projects, { ...newProject, techUsed: newProject.techUsed.split(',').map(t => t.trim()).filter(Boolean) }]
    newProject = emptyProject()
  }
  function removeProject(i) { projects = projects.filter((_, idx) => idx !== i) }

  // Cert list
  function addCert() {
    if (!newCert.title.trim()) return
    certs = [...certs, { ...newCert }]
    newCert = emptyCert()
  }
  function removeCert(i) { certs = certs.filter((_, idx) => idx !== i) }

  function validate() {
    errors = {}
    if (!name.trim()) errors.name = 'Name is required'
    if (!batch) errors.batch = 'Batch is required'
    return Object.keys(errors).length === 0
  }

  async function handleSubmit() {
    if (!validate() || saving) return
    saving = true
    try {
      let photoURL = initial.photoURL || null
      if (photoFile && $user) {
        photoURL = await uploadPhoto($user.uid, photoFile)
      }
      await onSave?.({
        name: name.trim(),
        bio: bio.trim(),
        batch,
        photoURL,
        skillIds,
        links: {
          github:    github.trim()    || null,
          linkedin:  linkedin.trim()  || null,
          portfolio: portfolio.trim() || null,
        },
        projects,
        certs,
      })
    } finally {
      saving = false
    }
  }
</script>

<form class="profile-form" on:submit|preventDefault={handleSubmit} novalidate>

  <!-- ── Basic Info ── -->
  <section class="form-section">
    <h3 class="text-card section-title">Basic Info</h3>

    <div class="field">
      <label for="pf-name">Full Name *</label>
      <input id="pf-name" bind:value={name} placeholder="Your full name" />
      {#if errors.name}<span class="field-error">{errors.name}</span>{/if}
    </div>

    <div class="field">
      <label for="pf-batch">Batch *</label>
      <select id="pf-batch" bind:value={batch}>
        <option value="" disabled selected>Select batch</option>
        <option value="MCA">MCA</option>
        <option value="MSc CS">MSc CS</option>
      </select>
      {#if errors.batch}<span class="field-error">{errors.batch}</span>{/if}
    </div>

    <div class="field">
      <label for="pf-bio">Bio</label>
      <textarea id="pf-bio" bind:value={bio} placeholder="A short intro about yourself…" rows="3"></textarea>
    </div>
  </section>

  <!-- ── Photo ── -->
  <section class="form-section">
    <h3 class="text-card section-title">Profile Photo</h3>
    <div class="photo-row">
      {#if photoPreview}
        <img src={photoPreview} alt="Preview" class="avatar" width="72" height="72" />
      {:else}
        <div class="avatar avatar-placeholder" style="width:72px;height:72px;font-size:1.4rem">
          {name ? name[0].toUpperCase() : '?'}
        </div>
      {/if}
      <label class="btn btn-ghost btn-sm photo-upload-btn" for="pf-photo">
        {photoPreview ? 'Change photo' : 'Upload photo'}
      </label>
      <input id="pf-photo" type="file" accept="image/*" on:change={handlePhoto} class="visually-hidden" />
    </div>
  </section>

  <!-- ── Skills ── -->
  <section class="form-section">
    <h3 class="text-card section-title">Skills</h3>
    <div class="skills-chips">
      {#each skillIds as sid}
        <SkillChip name={skillMap[sid] || sid} removable on_remove={() => removeSkill(sid)} />
      {/each}
    </div>
    <div class="skill-autocomplete" style="position:relative">
      <div class="field">
        <label for="pf-skill">Add skill</label>
        <input
          id="pf-skill"
          bind:value={skillQuery}
          on:input={handleSkillInput}
          on:blur={() => setTimeout(() => showSuggestions = false, 200)}
          placeholder="Type a skill name…"
          autocomplete="off"
        />
      </div>
      {#if showSuggestions && (suggestions.length > 0 || skillQuery.trim())}
        <ul class="suggestions">
          {#each suggestions as s}
            <li><button type="button" on:click={() => selectSkill(s)}>{s.name}</button></li>
          {/each}
          {#if skillQuery.trim() && !suggestions.find(s => s.name.toLowerCase() === skillQuery.toLowerCase())}
            <li class="create-skill">
              <button type="button" on:click={createSkill}>
                + Create "<strong>{skillQuery.trim()}</strong>"
              </button>
            </li>
          {/if}
        </ul>
      {/if}
    </div>
  </section>

  <!-- ── Links ── -->
  <section class="form-section">
    <h3 class="text-card section-title">Links</h3>
    <div class="field">
      <label for="pf-github">GitHub URL</label>
      <input id="pf-github" bind:value={github} placeholder="https://github.com/username" type="url" />
    </div>
    <div class="field">
      <label for="pf-linkedin">LinkedIn URL</label>
      <input id="pf-linkedin" bind:value={linkedin} placeholder="https://linkedin.com/in/username" type="url" />
    </div>
    <div class="field">
      <label for="pf-portfolio">Portfolio URL</label>
      <input id="pf-portfolio" bind:value={portfolio} placeholder="https://yoursite.com" type="url" />
    </div>
  </section>

  <!-- ── Projects ── -->
  <section class="form-section">
    <h3 class="text-card section-title">Projects</h3>
    {#each projects as p, i}
      <div class="item-card">
        <div class="item-header">
          <strong>{p.title}</strong>
          <button type="button" class="btn btn-danger btn-sm" on:click={() => removeProject(i)}>Remove</button>
        </div>
        {#if p.description}<p class="text-caption">{p.description}</p>{/if}
        {#if p.techUsed?.length}<p class="text-caption">Tech: {p.techUsed.join(', ')}</p>{/if}
        {#if p.link}<a href={p.link} target="_blank" rel="noopener" class="text-caption">{p.link}</a>{/if}
      </div>
    {/each}

    <div class="add-item-form card" style="box-shadow:none;background:var(--accent-soft)">
      <div class="field">
        <label for="proj-title">Project title</label>
        <input id="proj-title" bind:value={newProject.title} placeholder="Project name" />
      </div>
      <div class="field">
        <label for="proj-desc">Description</label>
        <textarea id="proj-desc" bind:value={newProject.description} rows="2" placeholder="What it does…"></textarea>
      </div>
      <div class="field">
        <label for="proj-tech">Tech used (comma-separated)</label>
        <input id="proj-tech" bind:value={newProject.techUsed} placeholder="React, Firebase, …" />
      </div>
      <div class="field">
        <label for="proj-link">Link (optional)</label>
        <input id="proj-link" bind:value={newProject.link} type="url" placeholder="https://…" />
      </div>
      <button type="button" class="btn btn-ghost btn-sm" on:click={addProject}>+ Add project</button>
    </div>
  </section>

  <!-- ── Certifications ── -->
  <section class="form-section">
    <h3 class="text-card section-title">Certifications</h3>
    {#each certs as c, i}
      <div class="item-card">
        <div class="item-header">
          <strong>{c.title}</strong>
          <button type="button" class="btn btn-danger btn-sm" on:click={() => removeCert(i)}>Remove</button>
        </div>
        <p class="text-caption">{c.issuer}{c.date ? ' · ' + c.date : ''}</p>
        {#if c.link}<a href={c.link} target="_blank" rel="noopener" class="text-caption">{c.link}</a>{/if}
      </div>
    {/each}

    <div class="add-item-form card" style="box-shadow:none;background:var(--accent-soft)">
      <div class="field">
        <label for="cert-title">Certificate title</label>
        <input id="cert-title" bind:value={newCert.title} placeholder="e.g. AWS Certified Developer" />
      </div>
      <div class="field">
        <label for="cert-issuer">Issuer</label>
        <input id="cert-issuer" bind:value={newCert.issuer} placeholder="e.g. Amazon Web Services" />
      </div>
      <div class="field">
        <label for="cert-date">Date</label>
        <input id="cert-date" bind:value={newCert.date} type="month" />
      </div>
      <div class="field">
        <label for="cert-link">Credential URL (optional)</label>
        <input id="cert-link" bind:value={newCert.link} type="url" placeholder="https://…" />
      </div>
      <button type="button" class="btn btn-ghost btn-sm" on:click={addCert}>+ Add certificate</button>
    </div>
  </section>

  <!-- ── Submit ── -->
  <div class="form-actions">
    <button type="submit" class="btn btn-primary btn-lg" disabled={saving}>
      {saving ? 'Saving…' : mode === 'create' ? 'Create Profile' : 'Save Changes'}
    </button>
  </div>

</form>

<style>
  .profile-form { display: flex; flex-direction: column; gap: 2rem; }
  .form-section { display: flex; flex-direction: column; gap: 1rem; }
  .section-title { color: var(--text-primary); padding-bottom: 0.5rem; border-bottom: 1px solid var(--surface-border); }
  .skills-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; min-height: 2rem; }
  .suggestions {
    position: absolute;
    top: calc(100% + 4px);
    left: 0; right: 0;
    background: var(--surface);
    border: 1px solid var(--surface-border);
    border-radius: 0.5rem;
    list-style: none;
    z-index: 50;
    overflow: hidden;
    box-shadow: var(--shadow-ambient);
  }
  .suggestions li button {
    width: 100%; text-align: left; padding: 0.6rem 0.875rem;
    background: none; border: none; color: var(--text-primary);
    cursor: pointer; font-size: 0.9rem;
  }
  .suggestions li button:hover { background: var(--accent-soft); color: var(--accent); }
  .create-skill button { color: var(--accent); font-weight: 600; }
  .photo-row { display: flex; align-items: center; gap: 1rem; }
  .photo-upload-btn { cursor: pointer; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }
  .item-card { background: var(--bg); border: 1px solid var(--surface-border); border-radius: 0.5rem; padding: 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .item-header { display: flex; align-items: center; justify-content: space-between; }
  .add-item-form { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border-radius: 0.75rem; border: 1px dashed var(--surface-border); }
  .form-actions { display: flex; justify-content: flex-end; padding-top: 1rem; }
  .field-error { font-size: 0.8rem; color: var(--danger, #dc2626); margin-top: -0.25rem; }
</style>
