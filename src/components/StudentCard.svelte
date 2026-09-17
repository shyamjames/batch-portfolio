<script>
  import SkillChip from './SkillChip.svelte'
  import { push } from 'svelte-spa-router'

  export let student = {}

  function initials(name) {
    return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  }

  function handleClick() {
    push(`/profile/${student.id}`)
  }
</script>

<article class="student-card card" on:click={handleClick} on:keydown={e => e.key==='Enter'&&handleClick()} tabindex="0" role="button" aria-label="View {student.name}'s profile">
  <div class="card-top">
    {#if student.photoURL}
      <img class="avatar" src={student.photoURL} alt="{student.name} photo" width="56" height="56" />
    {:else}
      <div class="avatar avatar-placeholder" style="width:56px;height:56px;font-size:1.1rem">{initials(student.name)}</div>
    {/if}
    <div class="card-info">
      <p class="card-name text-card">{student.name || 'Unknown'}</p>
      <span class="badge {student.batch === 'MCA' ? 'badge-mca' : 'badge-msc'}">{student.batch || '—'}</span>
    </div>
  </div>

  {#if student.bio}
    <p class="card-bio text-caption">{student.bio.slice(0, 80)}{student.bio.length > 80 ? '…' : ''}</p>
  {/if}

  <div class="card-skills">
    {#each (student.skillNames || []).slice(0, 3) as name}
      <SkillChip {name} />
    {/each}
    {#if (student.skillNames || []).length > 3}
      <span class="chip chip-more">+{student.skillNames.length - 3}</span>
    {/if}
  </div>
</article>

<style>
  .student-card {
    cursor: pointer;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    outline: none;
  }
  .student-card:focus-visible { box-shadow: 0 0 0 2px var(--accent); }
  .card-top {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }
  .card-info { display: flex; flex-direction: column; gap: 0.25rem; }
  .card-name { margin: 0; }
  .card-bio { color: var(--text-secondary); line-height: 1.45; }
  .card-skills { display: flex; flex-wrap: wrap; gap: 0.375rem; }
  .chip-more {
    display: inline-flex;
    align-items: center;
    padding: 0.2rem 0.65rem;
    border-radius: 999px;
    font-size: 0.8125rem;
    font-weight: 500;
    background: var(--surface-border);
    color: var(--text-secondary);
  }
</style>
