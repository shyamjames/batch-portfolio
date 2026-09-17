import { writable, derived } from 'svelte/store'
import { getStudent } from '../lib/firestore.js'
import { user } from './auth.js'

/** The Firestore student document for the current user (or null) */
export const currentStudent = writable(null)

/** Whether the current user has a profile doc */
export const hasProfile = derived(currentStudent, $s => $s !== null)

/** Load the current user's profile from Firestore */
export async function loadCurrentStudent(uid) {
  if (!uid) { currentStudent.set(null); return }
  const data = await getStudent(uid)
  currentStudent.set(data)
}

/** Invalidate / clear (e.g. on sign-out) */
export function clearCurrentStudent() {
  currentStudent.set(null)
}

// Reactively reload when user changes
user.subscribe(async ($user) => {
  if ($user) {
    await loadCurrentStudent($user.uid)
  } else {
    clearCurrentStudent()
  }
})
