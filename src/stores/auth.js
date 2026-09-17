import { writable, derived } from 'svelte/store'
import { onAuthStateChange } from '../lib/auth.js'

/** The Firebase User object (or null if signed out) */
export const user = writable(null)

/** True once onAuthStateChanged has fired at least once */
export const authReady = writable(false)

import { getUserRole } from '../lib/firestore.js'

/** The user's role: 'student' | 'viewer' | null */
export const userRole = writable(null)

// Subscribe to Firebase auth state changes
onAuthStateChange(async (firebaseUser) => {
  user.set(firebaseUser)
  if (firebaseUser) {
    const role = await getUserRole(firebaseUser.uid)
    userRole.set(role)
  } else {
    userRole.set(null)
  }
  authReady.set(true)
})

/** Convenience: true if user is signed in */
export const isLoggedIn = derived(user, $u => $u !== null)
