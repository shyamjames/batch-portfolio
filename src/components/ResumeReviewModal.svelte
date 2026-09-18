<script>
  import { createEventDispatcher, onMount } from 'svelte'
  import { get } from 'svelte/store'
  import { allSkills, ensureSkillsLoaded } from '../stores/skills.js'

  export let show = false
  export let rawData = { skills: [], projects: [], certifications: [] }
  
  const dispatch = createEventDispatcher()

  let parsedSkills = []
  let parsedProjects = []
  let parsedCerts = []

  let loading = true
  let isConfirming = false

  $: if (show && rawData) {
    loading = true
    processRawData(rawData).then(() => {
      loading = false
    })
  }

  async function processRawData(data) {
    await ensureSkillsLoaded()
    const globalSkills = get(allSkills)

    parsedSkills = (data.skills || []).map(skillName => {
      const q = skillName.trim().toLowerCase()
      const match = globalSkills.find(s => (s.nameLower || s.name.toLowerCase()) === q)
      return {
        id: crypto.randomUUID(),
        name: skillName.trim(),
        selected: true,
        existingId: match ? match.id : null,
        isExisting: !!match
      }
    })

    parsedProjects = (data.projects || []).map(p => ({
      id: crypto.randomUUID(),
      title: p.title || '',
      description: p.description || '',
      selected: true
    }))

    parsedCerts = (data.certifications || []).map(c => ({
      id: crypto.randomUUID(),
      title: c.title || '',
      issuer: c.issuer || '',
      selected: true
    }))
  }

  function handleConfirm() {
    if (isConfirming) return
    isConfirming = true
    dispatch('confirm', {
      skills: parsedSkills.filter(s => s.selected),
      projects: parsedProjects.filter(p => p.selected).map(p => ({ title: p.title, description: p.description, link: '', techUsed: '' })),
      certs: parsedCerts.filter(c => c.selected).map(c => ({ title: c.title, issuer: c.issuer, link: '', date: '' }))
    })
    
    // Reset state after a short delay so the modal can close smoothly
    setTimeout(() => { isConfirming = false }, 500)
  }

  function handleCancel() {
    dispatch('cancel')
  }
</script>

{#if show}
  <div class="modal-backdrop" on:click={handleCancel}>
    <div class="modal-content card" on:click|stopPropagation>
      <div class="modal-header">
        <h2 class="text-section">Review Extracted Data</h2>
        <button class="btn btn-icon" on:click={handleCancel} aria-label="Close">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>

      {#if loading}
        <div class="loading-state">Processing matches...</div>
      {:else}
        <div class="modal-body">
          <!-- Skills Section -->
          <div class="review-section">
            <h3 class="text-caption">Skills Found</h3>
            {#if parsedSkills.length === 0}
              <p class="empty-text">No skills found.</p>
            {/if}
            <div class="skills-grid">
              {#each parsedSkills as item (item.id)}
                <label class="review-item-checkbox">
                  <input type="checkbox" bind:checked={item.selected} />
                  <input type="text" class="input-text inline-edit" bind:value={item.name} />
                  {#if item.isExisting}
                    <span class="badge badge-existing">Existing</span>
                  {:else}
                    <span class="badge badge-new">New</span>
                  {/if}
                </label>
              {/each}
            </div>
          </div>

          <!-- Projects Section -->
          <div class="review-section">
            <h3 class="text-caption">Projects Found</h3>
            {#if parsedProjects.length === 0}
              <p class="empty-text">No projects found.</p>
            {/if}
            <div class="items-list">
              {#each parsedProjects as item (item.id)}
                <div class="review-card">
                  <label class="review-card-header">
                    <input type="checkbox" bind:checked={item.selected} />
                    <input type="text" class="input-text inline-edit bold" bind:value={item.title} placeholder="Project Title" />
                  </label>
                  <textarea class="input-text inline-edit" bind:value={item.description} placeholder="Project Description" rows="2"></textarea>
                </div>
              {/each}
            </div>
          </div>

          <!-- Certifications Section -->
          <div class="review-section">
            <h3 class="text-caption">Certifications Found</h3>
            {#if parsedCerts.length === 0}
              <p class="empty-text">No certifications found.</p>
            {/if}
            <div class="items-list">
              {#each parsedCerts as item (item.id)}
                <div class="review-card">
                  <label class="review-card-header">
                    <input type="checkbox" bind:checked={item.selected} />
                    <input type="text" class="input-text inline-edit bold" bind:value={item.title} placeholder="Certification Title" />
                  </label>
                  <input type="text" class="input-text inline-edit" bind:value={item.issuer} placeholder="Issuer" />
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <div class="modal-footer">
        <button class="btn btn-secondary" on:click={handleCancel} disabled={isConfirming}>Cancel</button>
        <button class="btn btn-primary" on:click={handleConfirm} disabled={isConfirming}>
          {isConfirming ? 'Adding...' : 'Confirm & Apply'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 9999;
    padding: 1rem;
    backdrop-filter: blur(4px);
  }

  .modal-content {
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    padding: 0;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid var(--surface-border);
  }

  .modal-body {
    padding: 1.5rem;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 2rem;
  }

  .modal-footer {
    padding: 1.5rem;
    border-top: 1px solid var(--surface-border);
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    background: var(--surface);
  }

  .review-section {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .skills-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .items-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .review-item-checkbox {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .review-card {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 1rem;
    background: var(--bg);
    border-radius: 0.5rem;
    border: 1px solid var(--surface-border);
  }

  .review-card-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .inline-edit {
    flex: 1;
    padding: 0.25rem 0.5rem;
    border: 1px solid transparent;
    background: transparent;
    border-radius: 0.25rem;
    transition: all 0.2s;
    color: var(--text); /* Fix for dark mode input text */
  }
  
  .inline-edit:hover, .inline-edit:focus {
    border-color: var(--surface-border);
    background: var(--surface);
  }
  
  .inline-edit.bold {
    font-weight: 600;
  }

  .badge {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .badge-existing {
    background: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
  }

  .badge-new {
    background: rgba(16, 185, 129, 0.1);
    color: #10b981;
  }

  .empty-text {
    font-size: 0.9rem;
    color: var(--text-secondary);
    font-style: italic;
  }

  .loading-state {
    padding: 3rem;
    text-align: center;
    color: var(--text-secondary);
  }
</style>
