import { storage } from './firebase.js'
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage'

/**
 * Upload a profile photo for the given uid.
 * Stored at photos/{uid}.jpg (matches storage rules).
 * Returns the public download URL.
 */
export async function uploadPhoto(uid, file) {
  const photoRef = ref(storage, `photos/${uid}.jpg`)
  const snapshot = await uploadBytes(photoRef, file, { contentType: 'image/jpeg' })
  return getDownloadURL(snapshot.ref)
}

/**
 * Get the download URL for a student's photo.
 * Returns null if no photo exists yet.
 */
export async function getPhotoURL(uid) {
  try {
    return await getDownloadURL(ref(storage, `photos/${uid}.jpg`))
  } catch {
    return null
  }
}

/**
 * Delete a student's profile photo.
 */
export async function deletePhoto(uid) {
  try {
    await deleteObject(ref(storage, `photos/${uid}.jpg`))
  } catch {
    // ignore if doesn't exist
  }
}
