import { writable } from 'svelte/store'
import { getAllSkills } from '../lib/firestore.js'

/** Full cached skills list — loaded once on demand */
export const allSkills = writable([])
export const skillsLoaded = writable(false)

let loading = false

export async function ensureSkillsLoaded() {
  if (loading) return
  loading = true
  try {
    const skills = await getAllSkills()
    allSkills.set(skills)
    skillsLoaded.set(true)
  } finally {
    loading = false
  }
}

/** Prefix search against the cached skills list */
export function searchSkills(query, currentSkillIds = []) {
  let result = []
  allSkills.subscribe(skills => {
    const q = query.toLowerCase().trim()
    result = skills.filter(s =>
      !currentSkillIds.includes(s.id) &&
      (s.nameLower ?? s.name.toLowerCase()).startsWith(q)
    )
  })()
  return result
}
