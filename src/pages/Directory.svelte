<script>
  import { onMount } from 'svelte'
  import StudentCard from '../components/StudentCard.svelte'
  import { getAllStudents, getAllSkills } from '../lib/firestore.js'
  import { querystring } from 'svelte-spa-router'

  let allStudents = []
  let allSkills   = []
  let loading     = true

  // Filters
  let nameFilter  = ''
  let batchFilter = 'all'
  let skillFilter = []    // array of skillIds

  // From URL query params
  $: qs = new URLSearchParams($querystring || '')
  $: {
    const q = qs.get('q')
    if (q && !nameFilter) nameFilter = q
    const sk = qs.get('skill')
    if (sk && !skillFilter.includes(sk)) skillFilter = [sk]
  }

  let skillDropdownOpen = false

  onMount(async () => {
    const [students, skills] = await Promise.all([getAllStudents(), getAllSkills()])
    allSkills = skills
    // Attach skill names to students
    const skillMap = Object.fromEntries(skills.map(s => [s.id, s.name]))
    allStudents = students.map(s => ({
      ...s,
      skillNames: (s.skillIds || []).map(id => skillMap[id]).filter(Boolean),
    }))
    loading = false
  })

  $: filtered = allStudents.filter(s => {
    const nameOk  = !nameFilter || (s.name || '').toLowerCase().includes(nameFilter.toLowerCase())
    const batchOk = batchFilter === 'all' || s.batch === batchFilter
    const skillOk = skillFilter.length === 0 || skillFilter.every(sid => (s.skillIds || []).includes(sid))
    return nameOk && batchOk && skillOk
  })

  function toggleSkillFilter(id) {
    if (skillFilter.includes(id)) {
      skillFilter = skillFilter.filter(s => s !== id)
    } else {
      skillFilter = [...skillFilter, id]
    }
  }

  function clearFilters() {
    nameFilter = ''
    batchFilter = 'all'
    skillFilter = []
  }
</script>

<svelte:head>
  <title>Directory — Batch Portfolio</title>
  <meta name="description" content="Browse all student profiles from the 2025–27 batch." />
</svelte:head>

  <div class="page-wrapper directory-page">

    <header class="dir-header">
      <div>
        <h1 class="text-section">Student Directory</h1>
        <p class="text-caption">{loading ? 'Loading…' : `${filtered.length} of ${allStudents.length} students`}</p>
      </div>
    </header>

    <!-- Filters -->
    <div class="filters card">
      <input
        class="filter-search"
        id="dir-search"
        type="search"
        placeholder="Search by name…"
        bind:value={nameFilter}
        aria-label="Search by name"
      />

      <div class="filter-group">
        <span class="filter-label">Batch</span>
        <div class="filter-pills">
          {#each ['all', 'MCA', 'MSc CS'] as b}
            <button
              class="filter-pill {batchFilter === b ? 'active' : ''}"
              on:click={() => batchFilter = b}
            >{b === 'all' ? 'All' : b}</button>
          {/each}
        </div>
      </div>

      <div class="filter-group" style="position:relative">
        <span class="filter-label">Skills</span>
        <button
          class="btn btn-ghost btn-sm"
          on:click={() => skillDropdownOpen = !skillDropdownOpen}
          id="skill-filter-btn"
        >
          {skillFilter.length ? `${skillFilter.length} selected` : 'Filter by skill'}
          ▾
        </button>
        {#if skillDropdownOpen}
          <div class="skill-dropdown">
            {#each allSkills as s}
              <label class="skill-option">
                <input type="checkbox" checked={skillFilter.includes(s.id)} on:change={() => toggleSkillFilter(s.id)} />
                {s.name}
                <span class="text-caption">({s.usageCount || 0})</span>
              </label>
            {/each}
          </div>
        {/if}
      </div>

      {#if nameFilter || batchFilter !== 'all' || skillFilter.length}
        <button class="btn btn-ghost btn-sm" on:click={clearFilters}>Clear filters</button>
      {/if}
    </div>

    <!-- Grid -->
    {#if loading}
      <div class="bento-grid student-grid">
        {#each Array(8) as _}
          <div class="card skeleton-card"><div class="skeleton" style="height:140px"></div></div>
        {/each}
      </div>
    {:else if filtered.length === 0}
      <div class="empty-state card">
        <p class="text-section" style="margin-bottom:0.5rem">No students found</p>
        <p class="text-caption">Try adjusting your filters.</p>
        <button class="btn btn-ghost btn-sm" on:click={clearFilters} style="margin-top:1rem">Clear filters</button>
      </div>
    {:else}
      <div class="bento-grid student-grid">
        {#each filtered as student (student.id)}
          <StudentCard {student} />
        {/each}
      </div>
    {/if}

  </div>

<style>
  .directory-page { padding: 2rem 1.5rem 4rem; }
  .dir-header { margin-bottom: 1.25rem; }

  .filters {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1.75rem;
    padding: 1rem 1.25rem;
  }
  .filter-search {
    background: var(--bg);
    border: none;
    border-radius: 0.5rem;
    padding: 0.5rem 0.875rem;
    color: var(--text-primary);
    font-size: 0.9rem;
    outline: none;
    box-shadow: var(--shadow-neu-inset);
    transition: all 0.2s;
    width: 200px;
  }
  .filter-search:focus { box-shadow: var(--shadow-neu-inset), 0 0 0 2px var(--accent-soft); }
  .filter-group { display: flex; align-items: center; gap: 0.5rem; }
  .filter-label { font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.04em; }
  .filter-pills { display: flex; gap: 0.375rem; }
  .filter-pill {
    padding: 0.35rem 0.875rem;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 600;
    background: var(--surface);
    border: none;
    box-shadow: var(--shadow-neu-sm);
    color: var(--text-secondary);
    cursor: pointer;
    transition: all 0.2s;
  }
  .filter-pill.active { background: var(--surface); box-shadow: var(--shadow-neu-inset-sm); color: var(--primary); }
  .filter-pill:hover:not(.active) { box-shadow: var(--shadow-neu); color: var(--text-primary); }

  .skill-dropdown {
    position: absolute;
    top: calc(100% + 12px);
    left: 0;
    background: var(--surface);
    border-radius: 1rem;
    z-index: 50;
    padding: 0.5rem;
    max-height: 260px;
    overflow-y: auto;
    box-shadow: var(--shadow-neu-hover);
    width: 240px;
  }
  .skill-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.4rem 0.5rem;
    border-radius: 0.375rem;
    cursor: pointer;
    font-size: 0.875rem;
  }
  .skill-option:hover { background: var(--accent-soft); }

  .student-grid { margin-top: 0; }
  .student-grid > :global(.span-3) { grid-column: span 3; }
  /* Override to make student cards span-3 */
  .student-grid { grid-template-columns: repeat(12, 1fr); }
  .student-grid :global(.student-card) { grid-column: span 3; }

  .skeleton-card { grid-column: span 3; }

  .empty-state { text-align: center; padding: 3rem; }

  @media (max-width: 900px) {
    .student-grid :global(.student-card), .skeleton-card { grid-column: span 4; }
  }
  @media (max-width: 600px) {
    .student-grid :global(.student-card), .skeleton-card { grid-column: span 12; }
  }
</style>
