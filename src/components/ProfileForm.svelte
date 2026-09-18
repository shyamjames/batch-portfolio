<script>
  import { onMount } from 'svelte'
  import { get } from 'svelte/store'
  import SkillChip from './SkillChip.svelte'
  import { allSkills, ensureSkillsLoaded, registerSkillInStore } from '../stores/skills.js'
  import { createSkillOnly } from '../lib/firestore.js'
  import { uploadPhoto, uploadResume, validateResume, validatePhoto } from '../lib/storage.js'
  import { user } from '../stores/auth.js'
  import { formatGithubUrl, formatLinkedinUrl, formatExternalUrl } from '../lib/url.js'
  import ResumeReviewModal from './ResumeReviewModal.svelte'

  export let mode = 'create'    // 'create' | 'edit'
  export let initial = {}       // initial data for edit mode
  export let onSave = null      // async (formData) => void
  export let saving = false

  function extractGithubUsername(urlOrHandle) {
    if (!urlOrHandle) return ''
    let val = urlOrHandle.trim()
    val = val.replace(/^https?:\/\//i, '')
    val = val.replace(/^(www\.)?github\.com\//i, '')
    val = val.replace(/^@/, '')
    return val.split('/')[0] || ''
  }

  // Form fields
  let name       = initial.name       || ''
  let bio        = initial.bio        || ''
  let batch      = initial.batch      || ''
  let githubUsername = extractGithubUsername(initial.links?.github || '')
  let linkedin   = initial.links?.linkedin   || ''
  let portfolio  = initial.links?.portfolio  || ''
  let photoFile    = null
  let photoPreview = initial.photoURL || null
  let photoError   = ''

  // Resume
  let resumeFile   = null
  let resumeURL    = initial.resumeURL || null
  let resumeError  = ''
  let resumeDragging = false

  // Resume Parsing
  let showReviewModal = false
  let parsingResume = false
  let parseError = ''
  let extractionData = null

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

  function handleGithubInput(e) {
    githubUsername = extractGithubUsername(e.target.value)
  }

  function selectSkill(skill) {
    if (!skill || skillIds.includes(skill.id)) return
    skillIds = [...skillIds, skill.id]
    skillMap[skill.id] = skill.name
    skillQuery = ''
    suggestions = []
    showSuggestions = false
  }

  let creatingSkill = false
  async function createSkill() {
    const name = skillQuery.trim()
    if (!name || creatingSkill) return
    creatingSkill = true

    // Optimistically clear input and dismiss dropdown for 0ms visual latency
    skillQuery = ''
    suggestions = []
    showSuggestions = false

    try {
      const newSkill = await createSkillOnly(name)
      registerSkillInStore(newSkill)
      if (!skillIds.includes(newSkill.id)) {
        skillIds = [...skillIds, newSkill.id]
        skillMap[newSkill.id] = newSkill.name
      }
    } catch (err) {
      console.error('Failed to create skill:', err)
      if (window.__showToast) {
        window.__showToast('Failed to create skill: ' + err.message, 'error')
      }
    } finally {
      creatingSkill = false
    }
  }

  function removeSkill(skillId) {
    skillIds = skillIds.filter(id => id !== skillId)
  }

  // Photo
  function handlePhoto(e) {
    const file = e.target.files?.[0]
    if (!file) return
    photoError = validatePhoto(file) || ''
    if (photoError) {
      photoFile = null
      if (window.__showToast) {
        window.__showToast(photoError, 'error')
      }
      return
    }
    photoFile = file
    photoPreview = URL.createObjectURL(file)
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

  async function handleParseResume() {
    if (!$user) return
    
    parsingResume = true
    parseError = ''
    
    let finalResumeURL = resumeURL || initial.resumeURL

    if (resumeFile) {
      try {
        finalResumeURL = await uploadResume($user.uid, resumeFile)
        resumeURL = finalResumeURL
      } catch (err) {
        console.error(err)
        parseError = 'Failed to upload resume before parsing.'
        parsingResume = false
        return
      }
    }

    if (!finalResumeURL) {
      parsingResume = false
      return
    }

    const lastParsed = initial.lastParsedAt || 0
    if (Date.now() - lastParsed < 24 * 60 * 60 * 1000) {
      parseError = 'You can only parse your resume once per 24 hours.'
      parsingResume = false
      return
    }
    try {
      const token = await $user.getIdToken()
      const res = await fetch('/api/parse-resume', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ resumeUrl: finalResumeURL })
      })
      if (!res.ok) throw new Error(await res.text())
      extractionData = await res.json()
      showReviewModal = true
    } catch (e) {
      console.error(e)
      parseError = 'Couldn\'t parse this resume automatically — please fill in manually.'
    } finally {
      parsingResume = false
    }
  }

  async function handleReviewConfirm(e) {
    const { skills: parsedSkills, projects: parsedProjects, certs: parsedCerts } = e.detail
    
    // Add projects
    projects = [...projects, ...parsedProjects]
    
    // Add certs
    certs = [...certs, ...parsedCerts]
    
    // Add skills (creating new ones if needed)
    for (const s of parsedSkills) {
      if (s.isExisting && s.existingId) {
        if (!skillIds.includes(s.existingId)) {
          skillIds = [...skillIds, s.existingId]
          skillMap[s.existingId] = s.name
        }
      } else {
        try {
          const newSkill = await createSkillOnly(s.name)
          registerSkillInStore(newSkill)
          if (!skillIds.includes(newSkill.id)) {
            skillIds = [...skillIds, newSkill.id]
            skillMap[newSkill.id] = newSkill.name
          }
        } catch (err) {
          console.error('Failed to create extracted skill:', err)
        }
      }
    }
    
    // Mark as parsed so we can update lastParsedAt on save
    initial.lastParsedAt = Date.now() // optimism
    
    showReviewModal = false
    extractionData = null
  }

  function formatBytes(bytes) {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + ' KB'
    return (bytes / 1024 / 1024).toFixed(1) + ' MB'
  }

  // Project list
  function addProject() {
    if (!newProject.title || !newProject.title.trim()) return
    const tech = typeof newProject.techUsed === 'string'
      ? newProject.techUsed.split(',').map(t => t.trim()).filter(Boolean)
      : (Array.isArray(newProject.techUsed) ? newProject.techUsed : [])
    let link = formatExternalUrl(newProject.link)
    projects = [
      ...projects,
      {
        title: newProject.title.trim(),
        description: (newProject.description || '').trim(),
        techUsed: tech,
        link,
      }
    ]
    newProject = emptyProject()
  }
  function removeProject(i) { projects = projects.filter((_, idx) => idx !== i) }

  // Cert list
  function addCert() {
    if (!newCert.title || !newCert.title.trim()) return
    let link = formatExternalUrl(newCert.link)
    certs = [
      ...certs,
      {
        title: newCert.title.trim(),
        issuer: (newCert.issuer || '').trim(),
        date: (newCert.date || '').trim(),
        link,
      }
    ]
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
    // Auto-commit any in-progress project or certificate input if user didn't click "+ Add"
    if (newProject.title && newProject.title.trim()) {
      addProject()
    }
    if (newCert.title && newCert.title.trim()) {
      addCert()
    }

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

      // Add a safety timeout so it doesn't hang forever
      const savePromise = onSave?.({
        name: name.trim(),
        bio: bio.trim(),
        batch,
        photoURL,
        resumeURL: finalResumeURL,
        links: {
          github:    githubUsername.trim() ? `https://github.com/${githubUsername.trim()}` : null,
          linkedin:  formatLinkedinUrl(linkedin) || null,
          portfolio: formatExternalUrl(portfolio) || null,
        },
        skills: skillIds,
        projects,
        certs,
        lastParsedAt: initial.lastParsedAt || null
      })

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error("Save operation timed out after 10 seconds")), 10000))
      
      await Promise.race([savePromise, timeoutPromise])

    } catch (e) {
      console.error('Failed to save profile:', e)
      if (window.__showToast) {
        window.__showToast(e.message || 'Failed to save profile', 'error')
      } else {
        alert("Error saving profile: " + e.message)
      }
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
        <p class="upload-label">Photo <span class="upload-hint">(max 1 MB)</span></p>
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
        {#if photoError}
          <p class="field-error" style="margin-top:0.25rem">{photoError}</p>
        {/if}
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

        {#if resumeURL || initial.resumeURL || resumeFile}
          <div style="margin-top: 1rem; display: flex; flex-direction: column; gap: 0.5rem; align-items: flex-start;">
            <button type="button" class="btn btn-secondary" on:click={handleParseResume} disabled={parsingResume}>
              {#if parsingResume}
                Parsing...
              {:else}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 0.5rem;"><path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8"></path><path d="M21 3v5h-5"></path></svg>
                Parse resume with AI
              {/if}
            </button>
            {#if parseError}
              <p class="error-msg">{parseError}</p>
            {:else}
              <p class="text-caption" style="color: var(--text-secondary); max-width: 400px; font-size: 0.8rem;">
                Auto-fill your skills, projects & certifications. This does not overwrite your existing data, it only adds to it.
              </p>
            {/if}
          </div>
        {/if}
      </div>
    </div>
  </section>

  <!-- ── Skills ── -->
  <section class="form-section">
    <h3 class="text-card section-title">Skills</h3>
    <div class="skills-chips">
      {#each skillIds as sid}
        {#if skillMap[sid]}
          <SkillChip name={skillMap[sid]} removable on_remove={() => removeSkill(sid)} />
        {/if}
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
          on:keydown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              if (!skillQuery.trim()) return;
              const exact = suggestions.find(s => s.name.toLowerCase() === skillQuery.trim().toLowerCase());
              if (exact) selectSkill(exact);
              else createSkill();
            }
          }}
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
      <label for="pf-github">GitHub Username</label>
      <div class="url-input-group">
        <span class="url-prefix">https://github.com/</span>
        <input
          id="pf-github"
          bind:value={githubUsername}
          on:input={handleGithubInput}
          placeholder="username"
          autocomplete="off"
          spellcheck="false"
        />
      </div>
      <span class="field-hint">Enter your GitHub username only (e.g. {name ? name.toLowerCase().replace(/\s+/g, '') : 'username'})</span>
    </div>
    <div class="field">
      <label for="pf-linkedin">LinkedIn Profile URL</label>
      <input
        id="pf-linkedin"
        bind:value={linkedin}
        placeholder="https://linkedin.com/in/your-profile"
        type="url"
        spellcheck="false"
      />
      <span class="field-hint">Enter your full LinkedIn profile URL</span>
    </div>
    <div class="field">
      <label for="pf-portfolio">Portfolio URL</label>
      <input id="pf-portfolio" bind:value={portfolio} placeholder="https://yoursite.com" type="url" />
    </div>
  </section>

  <!-- ── Projects ── -->
  <section class="form-section">
    <div class="section-title-row">
      <h3 class="text-card section-title" style="margin-bottom:0">Projects</h3>
      {#if projects.length > 0}
        <span class="text-caption">{projects.length} added</span>
      {/if}
    </div>

    {#if projects.length > 0}
      <div class="items-list">
        {#each projects as p, i}
          <div class="item-card">
            <div class="item-header">
              <div class="item-title-col">
                <strong class="text-card">{p.title}</strong>
                {#if p.link}
                  <a href={formatExternalUrl(p.link)} target="_blank" rel="noopener noreferrer" class="text-caption link-external">↗ Link</a>
                {/if}
              </div>
              <button type="button" class="btn btn-danger btn-sm" on:click={() => removeProject(i)}>Remove</button>
            </div>
            {#if p.description}<p class="text-caption" style="margin:0.25rem 0">{p.description}</p>{/if}
            {#if p.techUsed?.length}
              <div class="tech-chips">
                {#each p.techUsed as t}
                  <span class="tech-chip">{t}</span>
                {/each}
              </div>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <div class="add-item-form">
      <span class="text-card" style="font-size:0.875rem;font-weight:600">+ Add a Project</span>
      <div class="field">
        <label for="proj-title">Project title</label>
        <input id="proj-title" bind:value={newProject.title} on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProject(); } }} placeholder="Project name" />
      </div>
      <div class="field">
        <label for="proj-desc">Description</label>
        <textarea id="proj-desc" bind:value={newProject.description} rows="2" placeholder="What it does…"></textarea>
      </div>
      <div class="field">
        <label for="proj-tech">Tech used (comma-separated)</label>
        <input id="proj-tech" bind:value={newProject.techUsed} on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProject(); } }} placeholder="React, Firebase, …" />
      </div>
      <div class="field">
        <label for="proj-link">Link (optional)</label>
        <input id="proj-link" bind:value={newProject.link} on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addProject(); } }} type="url" placeholder="https://…" />
      </div>
      <button type="button" class="btn btn-secondary btn-sm" style="align-self:flex-start" on:click={addProject}>+ Add Project to List</button>
    </div>
  </section>

  <!-- ── Certifications ── -->
  <section class="form-section">
    <div class="section-title-row">
      <h3 class="text-card section-title" style="margin-bottom:0">Certifications</h3>
      {#if certs.length > 0}
        <span class="text-caption">{certs.length} added</span>
      {/if}
    </div>

    {#if certs.length > 0}
      <div class="items-list">
        {#each certs as c, i}
          <div class="item-card">
            <div class="item-header">
              <div class="item-title-col">
                <strong class="text-card">{c.title}</strong>
                {#if c.link}
                  <a href={formatExternalUrl(c.link)} target="_blank" rel="noopener noreferrer" class="text-caption link-external">↗ Link</a>
                {/if}
              </div>
              <button type="button" class="btn btn-danger btn-sm" on:click={() => removeCert(i)}>Remove</button>
            </div>
            <p class="text-caption">{c.issuer}{c.date ? ' · ' + c.date : ''}</p>
          </div>
        {/each}
      </div>
    {/if}

    <div class="add-item-form">
      <span class="text-card" style="font-size:0.875rem;font-weight:600">+ Add a Certification</span>
      <div class="field">
        <label for="cert-title">Certificate title</label>
        <input id="cert-title" bind:value={newCert.title} on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }} placeholder="e.g. AWS Certified Developer" />
      </div>
      <div class="field">
        <label for="cert-issuer">Issuer</label>
        <input id="cert-issuer" bind:value={newCert.issuer} on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }} placeholder="e.g. Amazon Web Services" />
      </div>
      <div class="field">
        <label for="cert-date">Date</label>
        <input id="cert-date" bind:value={newCert.date} on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }} type="month" />
      </div>
      <div class="field">
        <label for="cert-link">Credential URL (optional)</label>
        <input id="cert-link" bind:value={newCert.link} on:keydown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCert(); } }} type="url" placeholder="https://…" />
      </div>
      <button type="button" class="btn btn-secondary btn-sm" style="align-self:flex-start" on:click={addCert}>+ Add Certificate to List</button>
    </div>
  </section>

  <!-- ── Submit ── -->
  <div class="form-actions">
    <button type="submit" class="btn btn-primary btn-lg" disabled={saving}>
      {saving ? 'Saving…' : mode === 'create' ? 'Create Profile' : 'Save Changes'}
    </button>
  </div>

</form>

<ResumeReviewModal
  show={showReviewModal}
  rawData={extractionData}
  on:cancel={() => { showReviewModal = false; extractionData = null; }}
  on:confirm={handleReviewConfirm}
/>

<style>
  .profile-form { display: flex; flex-direction: column; gap: 2rem; }
  .form-section { display: flex; flex-direction: column; gap: 1rem; }
  .section-title { color: var(--text-primary); padding-bottom: 0.5rem; margin-bottom: 1rem; border-bottom: 2px solid transparent; box-shadow: 0 4px 6px -6px rgba(0,0,0,0.1); }
  .skills-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; min-height: 2rem; }
  .suggestions {
    position: absolute;
    top: calc(100% + 4px);
    left: 0; right: 0;
    background: var(--surface);
    border-radius: 1rem;
    box-shadow: var(--shadow-neu-hover);
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
    background: var(--bg);
    box-shadow: var(--shadow-neu-inset);
    border: none;
    border-radius: 1rem;
    padding: 1.25rem 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    cursor: pointer;
    min-height: 110px;
    transition: all 0.2s;
    gap: 0.25rem;
    outline: none;
  }
  .resume-dropzone:hover,
  .resume-dropzone:focus-visible { box-shadow: var(--shadow-neu-inset), 0 0 0 2px var(--accent-soft); }
  .resume-dropzone.dragging { box-shadow: var(--shadow-neu-inset), 0 0 0 2px var(--accent-soft); }
  .resume-dropzone.has-file  { background: var(--surface); box-shadow: var(--shadow-neu-sm); }
  .resume-dropzone.has-error { box-shadow: var(--shadow-neu-inset), 0 0 0 2px var(--danger); }
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
  .item-card { background: var(--surface); border: none; box-shadow: var(--shadow-neu-sm); border-radius: 0.75rem; padding: 1rem; display: flex; flex-direction: column; gap: 0.375rem; }
  .item-header { display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; }
  .item-title-col { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
  .items-list { display: flex; flex-direction: column; gap: 0.75rem; }
  .section-title-row { display: flex; justify-content: space-between; align-items: baseline; }
  .link-external { text-decoration: underline; color: var(--text-primary); font-weight: 500; }
  .tech-chips { display: flex; flex-wrap: wrap; gap: 0.375rem; }
  .tech-chip {
    padding: 0.15rem 0.5rem; border-radius: 999px;
    font-size: 0.75rem; font-weight: 500;
    background: var(--bg);
    box-shadow: var(--shadow-neu-inset-sm);
    color: var(--text-secondary);
  }
  .add-item-form { display: flex; flex-direction: column; gap: 0.75rem; padding: 1.25rem; border-radius: 1rem; background: var(--bg); box-shadow: var(--shadow-neu-inset); }
  .form-actions { display: flex; justify-content: flex-end; padding-top: 1rem; }
  .field-error { font-size: 0.8rem; color: var(--danger, #dc2626); margin-top: -0.25rem; }

  /* URL input group with prefix */
  .url-input-group {
    display: flex;
    align-items: center;
    background: var(--bg);
    border-radius: 0.5rem;
    box-shadow: var(--shadow-neu-inset);
    overflow: hidden;
    transition: all 0.15s;
  }
  .url-input-group:focus-within {
    box-shadow: var(--shadow-neu-inset), 0 0 0 2px var(--primary);
  }
  .url-prefix {
    padding: 0.75rem 0.25rem 0.75rem 1rem;
    font-family: 'Geist Mono', monospace;
    font-size: 0.875rem;
    font-weight: 500;
    color: var(--text-secondary);
    user-select: none;
    white-space: nowrap;
    opacity: 0.85;
  }
  .url-input-group input {
    background: transparent;
    border: none;
    box-shadow: none !important;
    padding: 0.75rem 1rem 0.75rem 0.25rem;
    color: var(--text-primary);
    font-family: 'Geist Mono', monospace;
    font-size: 0.9rem;
    width: 100%;
    outline: none;
  }
  .field-hint {
    font-size: 0.75rem;
    color: var(--text-secondary);
    padding-left: 0.25rem;
    margin-top: -0.25rem;
  }
</style>
