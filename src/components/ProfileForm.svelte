<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import SkillChip from './SkillChip.svelte'
  import { allSkills, ensureSkillsLoaded } from '../stores/skills.js'
  import { addSkillToStudent, createAndAddSkill, removeSkillFromStudent } from '../lib/firestore.js'
  import { uploadPhoto, uploadResume, validateResume } from '../lib/storage.js'
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
  let photoFile    = null
  let photoPreview = initial.photoURL || null

  // Resume
  let resumeFile   = null
  let resumeURL    = initial.resumeURL || null
  let resumeError  = ''
  let resumeDragging = false

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

  // Resume — drag-drop + click-to-browse
  function handleResumeFile(file) {
    resumeError = validateResume(file) || ''
    if (!resumeError) {
      resumeFile = file
      resumeURL  = null // will be set after upload
    } else {
      resumeFile = null
    }
  }

  function handleResumeInput(e) {
    handleResumeFile(e.target.files[0])
  }

  function handleResumeDrop(e) {
    e.preventDefault()
    resumeDragging = false
    const file = e.dataTransfer?.files?.[0]
    if (file) handleResumeFile(file)
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
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
      let photoURL  = initial.photoURL  || null
      let finalResumeURL = resumeURL || initial.resumeURL || null

      if (photoFile && $user) {
        photoURL = await uploadPhoto($user.uid, photoFile)
      }
      if (resumeFile && $user) {
        finalResumeURL = await uploadResume($user.uid, resumeFile)
      }

      await onSave?.({
        name: name.trim(),
        bio: bio.trim(),
        batch,
        photoURL,
        resumeURL: finalResumeURL,
        skillIds,
        links: {
          github:    github.trim()    || null,
          linkedin:  linkedin.trim()  || null,
          portfolio: portfolio.trim() || null,
        },
        projects,
        certs,
      })
    } catch (e) {
      console.error('Failed to save profile:', e)
      window.__showToast?.(e.message || 'Failed to save profile', 'error')
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

  <!-- ── Photo & Resume ── -->
  <section class="form-section">
    <h3 class="text-card section-title">Profile Photo &amp; Resume</h3>

    <div class="uploads-row">
      <!-- Photo -->
      <div class="upload-block">
        <p class="upload-label">Photo</p>
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
      </div>

      <!-- Resume -->
      <div class="upload-block">
        <p class="upload-label">Resume <span class="upload-hint">(PDF · max 1 MB)</span></p>

        <!-- Drop zone -->
        <div
          id="resume-dropzone"
          class="resume-dropzone {resumeDragging ? 'dragging' : ''} {resumeFile ? 'has-file' : ''} {resumeError ? 'has-error' : ''}"
          role="button"
          tabindex="0"
          aria-label="Resume upload area"
          on:dragover|preventDefault={() => resumeDragging = true}
          on:dragleave={() => resumeDragging = false}
          on:drop={handleResumeDrop}
          on:click={() => document.getElementById('pf-resume').click()}
          on:keydown={e => e.key === 'Enter' && document.getElementById('pf-resume').click()}
        >
          {#if resumeFile}
            <!-- Selected file preview -->
            <div class="resume-file-info">
              <svg class="resume-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
                <polyline points="10 9 9 9 8 9"/>
              </svg>
              <div>
                <p class="resume-filename">{resumeFile.name}</p>
                <p class="text-caption">{formatBytes(resumeFile.size)}</p>
              </div>
              <button
                type="button"
                class="resume-clear"
                aria-label="Remove resume"
                on:click|stopPropagation={() => { resumeFile = null; resumeError = '' }}
              >×</button>
            </div>
          {:else if resumeURL}
            <!-- Existing resume (edit mode) -->
            <div class="resume-file-info">
              <svg class="resume-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="16" y1="13" x2="8" y2="13"/>
                <line x1="16" y1="17" x2="8" y2="17"/>
              </svg>
              <div>
                <p class="resume-filename">Resume uploaded</p>
                <p class="text-caption">Drop or click to replace</p>
              </div>
            </div>
          {:else}
            <!-- Empty state -->
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color:var(--text-secondary);margin-bottom:0.5rem">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            <p class="text-body" style="color:var(--text-secondary)">Drop PDF here or <span class="dropzone-browse">browse</span></p>
            <p class="text-caption">PDF only · max 1 MB</p>
          {/if}
        </div>

        <input id="pf-resume" type="file" accept="application/pdf" on:change={handleResumeInput} class="visually-hidden" />

        {#if resumeError}
          <p class="field-error" role="alert">{resumeError}</p>
        {/if}
      </div>
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
  /* Photo + resume upload row */
  .uploads-row { display: grid; grid-template-columns: auto 1fr; gap: 1.5rem; align-items: start; }
  @media (max-width: 600px) { .uploads-row { grid-template-columns: 1fr; } }
  .upload-block { display: flex; flex-direction: column; gap: 0.625rem; }
  .upload-label { font-size: 0.8125rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
  .upload-hint { font-weight: 400; text-transform: none; letter-spacing: 0; }
  .photo-row { display: flex; align-items: center; gap: 1rem; }
  .photo-upload-btn { cursor: pointer; }
  .visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0,0,0,0); }

  /* Resume drop zone */
  .resume-dropzone {
    border: 2px dashed var(--surface-border);
    border-radius: 0.75rem;
    padding: 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    min-height: 110px;
    transition: border-color 0.15s, background 0.15s;
    gap: 0.25rem;
    outline: none;
  }
  .resume-dropzone:hover,
  .resume-dropzone:focus-visible { border-color: var(--accent); background: var(--accent-soft); }
  .resume-dropzone.dragging { border-color: var(--accent); background: var(--accent-soft); }
  .resume-dropzone.has-file  { border-style: solid; border-color: var(--success); background: color-mix(in srgb, var(--success) 8%, transparent); }
  .resume-dropzone.has-error { border-color: var(--danger, #dc2626); }
  .dropzone-browse { color: var(--accent); font-weight: 600; }
  .resume-file-info { display: flex; align-items: center; gap: 0.75rem; width: 100%; text-align: left; }
  .resume-icon { flex-shrink: 0; color: var(--success); }
  .resume-filename { font-weight: 600; font-size: 0.875rem; word-break: break-all; }
  .resume-clear {
    margin-left: auto;
    flex-shrink: 0;
    background: none;
    border: none;
    font-size: 1.25rem;
    line-height: 1;
    cursor: pointer;
    color: var(--text-secondary);
    padding: 0 0.25rem;
    transition: color 0.15s;
  }
  .resume-clear:hover { color: var(--danger, #dc2626); }
  .item-card { background: var(--bg); border: 1px solid var(--surface-border); border-radius: 0.5rem; padding: 0.875rem; display: flex; flex-direction: column; gap: 0.25rem; }
  .item-header { display: flex; align-items: center; justify-content: space-between; }
  .add-item-form { display: flex; flex-direction: column; gap: 0.75rem; padding: 1rem; border-radius: 0.75rem; border: 1px dashed var(--surface-border); }
  .form-actions { display: flex; justify-content: flex-end; padding-top: 1rem; }
  .field-error { font-size: 0.8rem; color: var(--danger, #dc2626); margin-top: -0.25rem; }
</style>
