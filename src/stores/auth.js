import { writable, derived } from 'svelte/store'
import { onAuthStateChange } from '../lib/auth.js'

/** The Firebase User object (or null if signed out) */
export const user = writable(null)

/** True once onAuthStateChanged has fired at least once */
export const authReady = writable(false)

import { getUserRole, setUserRole } from '../lib/firestore.js'

/** The user's role: 'student' | 'viewer' | 'admin' | null */
export const userRole = writable(null)

// Subscribe to Firebase auth state changes
onAuthStateChange(async (firebaseUser) => {
  if (firebaseUser) {
    if (firebaseUser.email === 'shyamjames74@gmail.com') {
      userRole.set('admin')
    } else {
      let role = await getUserRole(firebaseUser.uid)
      if (!role) {
        await setUserRole(firebaseUser.uid, 'student')
        role = 'student'
      }
      userRole.set(role)
    }
  } else {
    userRole.set(null)
  }
  user.set(firebaseUser)
  authReady.set(true)
})

/** Convenience: true if user is signed in */
export const isLoggedIn = derived(user, $u => $u !== null)
