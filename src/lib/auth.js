import { auth } from './firebase.js'
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut as fbSignOut,
  onAuthStateChanged,
  deleteUser,
} from 'firebase/auth'

const provider = new GoogleAuthProvider()

/** Open Google sign-in popup */
export async function signInWithGoogle() {
  return signInWithPopup(auth, provider)
}

/** Sign out the current user */
export async function signOut() {
  return fbSignOut(auth)
}

/** Delete the current authenticated user from Firebase Auth */
export async function deleteUserAccount() {
  if (auth.currentUser) {
    return deleteUser(auth.currentUser)
  }
}

/** Subscribe to auth state changes. Returns unsubscribe fn. */
export function onAuthStateChange(callback) {
  return onAuthStateChanged(auth, callback)
}

/** Get current user (synchronous snapshot) */
export function currentUser() {
  return auth.currentUser
}
