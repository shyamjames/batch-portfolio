# Migrate from Firebase Storage to Cloudinary (Free Tier Restrictions)

## The Problem
Firebase now requires a billing account (Blaze Plan) to provision any new Storage buckets to prevent abuse. Because of this, our application throws a CORS/404 error and hangs on the "Saving..." button when trying to upload a profile photo or resume, as the default Firebase Storage bucket cannot be created on the completely free Spark plan.

## The Solution
Migrate image and PDF storage to **Cloudinary**, which offers a massive 25GB free tier, requires NO credit card, and allows direct "unsigned" uploads from the frontend without needing a backend server or exposing sensitive keys.

## Tasks to Complete

### 1. Cloudinary Setup (Dashboard)
- Create a free account at [Cloudinary](https://cloudinary.com/).
- Navigate to **Settings (Gear Icon) -> Upload**.
- Scroll to **Upload presets** and click **Add upload preset**.
- Name the preset (e.g., `batch_portfolio_uploads`).
- **CRITICAL:** Change the **Signing Mode** from "Signed" to **"Unsigned"**.
- Click **Save**.
- Locate your **Cloud Name** in the dashboard.

### 2. Environment Variables
Add the following to `.env.local` (and your Vercel deployment variables):
```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
```

### 3. Code Modifications (`src/lib/storage.js`)
Replace the `firebase/storage` logic with standard browser `fetch()` calls.

**Example Implementation for Photo Upload:**
```javascript
export async function uploadPhoto(uid, file) {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', preset);
  // Optional: add public_id to link it to the uid
  formData.append('public_id', `photo_${uid}`);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData
  });
  
  if (!res.ok) throw new Error("Failed to upload photo to Cloudinary");
  const data = await res.json();
  return data.secure_url;
}
```
*(Repeat a similar structure for `uploadResume`, hitting `/raw/upload` or `/auto/upload` for PDFs).*

### 4. Component Updates
- No changes needed in `ProfileForm.svelte` or `Edit.svelte`. The UI already uses the `uploadPhoto` and `uploadResume` wrappers from `storage.js`, so the migration will be completely seamless to the rest of the application.
