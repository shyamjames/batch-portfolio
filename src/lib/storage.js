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

// ─── Resume helpers ───────────────────────────────────────────────────────────

const MAX_RESUME_BYTES = 1 * 1024 * 1024 // 1 MB

/**
 * Client-side validation before upload.
 * Returns an error string, or null if the file is valid.
 */
export function validateResume(file) {
  if (!file) return 'No file selected.'
  if (file.type !== 'application/pdf') return 'Only PDF files are accepted.'
  if (file.size > MAX_RESUME_BYTES) return `File too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum is 1 MB.`
  return null
}

/**
 * Upload a resume PDF for the given uid.
 * Stored at resumes/{uid} — overwrites any previous version.
 * Returns the authenticated download URL.
 */
export async function uploadResume(uid, file) {
  const resumeRef = ref(storage, `resumes/${uid}`)
  const snapshot = await uploadBytes(resumeRef, file, { contentType: 'application/pdf' })
  return getDownloadURL(snapshot.ref)
}

/**
 * Get the authenticated download URL for a student's resume.
 * Returns null if none exists.
 */
export async function getResumeURL(uid) {
  try {
    return await getDownloadURL(ref(storage, `resumes/${uid}`))
  } catch {
    return null
  }
}

/**
 * Delete a student's resume.
 */
export async function deleteResume(uid) {
  try {
    await deleteObject(ref(storage, `resumes/${uid}`))
  } catch {
    // ignore if doesn't exist
  }
}
