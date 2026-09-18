const MAX_PHOTO_BYTES  = 1 * 1024 * 1024 // 1 MB
const MAX_RESUME_BYTES = 1 * 1024 * 1024 // 1 MB

/**
 * Client-side validation for profile photos before upload.
 * Returns an error string, or null if the file is valid.
 */
export function validatePhoto(file) {
  if (!file) return 'No file selected.'
  if (!file.type.startsWith('image/')) return 'Only image files (JPEG, PNG, WEBP, etc.) are accepted.'
  if (file.size > MAX_PHOTO_BYTES) {
    return `Photo too large (${(file.size / 1024 / 1024).toFixed(1)} MB). Maximum size is 1 MB.`
  }
  return null
}

/**
 * Upload a profile photo for the given uid using Cloudinary unsigned uploads.
 * Returns the public download URL.
 */
export async function uploadPhoto(uid, file) {
  const validationError = validatePhoto(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !preset) {
    throw new Error("Cloudinary environment variables are missing.");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  
  // We use the image/upload endpoint for photos
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to upload photo to Cloudinary");
  }
  
  const data = await res.json();
  return data.secure_url;
}


// ─── Resume helpers ───────────────────────────────────────────────────────────

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
 * Upload a resume PDF for the given uid using Cloudinary unsigned uploads.
 * Returns the public download URL.
 */
export async function uploadResume(uid, file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  if (!cloudName || !preset) {
    throw new Error("Cloudinary environment variables are missing.");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);

  // We use the raw/upload endpoint for PDFs (or auto/upload)
  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || "Failed to upload resume to Cloudinary");
  }
  
  const data = await res.json();
  return data.secure_url;
}
