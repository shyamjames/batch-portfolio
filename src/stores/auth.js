import { writable, derived } from 'svelte/store'
import { onAuthStateChange } from '../lib/auth.js'

/** The Firebase User object (or null if signed out) */
export const user = writable(null)

/** True once onAuthStateChanged has fired at least once */
export const authReady = writable(false)

// Subscribe to Firebase auth state changes
onAuthStateChange((firebaseUser) => {
  user.set(firebaseUser)
  authReady.set(true)
})

/** Convenience: true if user is signed in */
export const isLoggedIn = derived(user, $u => $u !== null)
