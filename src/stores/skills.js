import { writable, get } from 'svelte/store'
import { getAllSkills } from '../lib/firestore.js'

/** Full cached skills list — loaded once on demand */
export const allSkills = writable([])
export const skillsLoaded = writable(false)

let loading = false

export async function ensureSkillsLoaded() {
  if (get(skillsLoaded) || loading) return
  loading = true
  try {
    const skills = await getAllSkills()
    allSkills.set(skills)
    skillsLoaded.set(true)
  } finally {
    loading = false
  }
}

/** Prefix/substring search against the cached skills list */
export function searchSkills(query, currentSkillIds = []) {
  const skills = get(allSkills)
  const q = query.toLowerCase().trim()
  if (!q) return []
  return skills.filter(s =>
    !currentSkillIds.includes(s.id) &&
    (s.nameLower ?? s.name.toLowerCase()).includes(q)
  )
}
