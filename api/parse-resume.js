import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { GoogleGenAI } from '@google/genai';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

let initError = null;

// Initialize Firebase Admin (only once)
if (!getApps().length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      // Strip potential wrapping single quotes from dotenv
      let saStr = process.env.FIREBASE_SERVICE_ACCOUNT.trim();
      if (saStr.startsWith("'") && saStr.endsWith("'")) {
        saStr = saStr.slice(1, -1);
      }
      const serviceAccount = JSON.parse(saStr);
      initializeApp({
        credential: cert(serviceAccount)
      });
    } else {
      initError = 'FIREBASE_SERVICE_ACCOUNT environment variable is missing.';
    }
  } catch (error) {
    initError = error.message;
  }
}

export default async function handler(req, res) {
  if (initError) {
    return res.status(500).json({ error: `Firebase Init Error: ${initError}` });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // 1. Verify Authentication
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: Missing or invalid authorization header' });
  }

  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await getAuth().verifyIdToken(token);
    if (!decodedToken.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: `Unauthorized: Token verification failed (${error.message})` });
  }

  // 2. Extract inputs
  const { resumeUrl } = req.body;
  if (!resumeUrl) {
    return res.status(400).json({ error: 'Bad Request: resumeUrl is required' });
  }

  try {
    // 3. Fetch PDF bytes
    const pdfResponse = await fetch(resumeUrl);
    if (!pdfResponse.ok) {
      throw new Error(`Failed to fetch PDF from Cloudinary: ${pdfResponse.statusText}`);
    }
    const arrayBuffer = await pdfResponse.arrayBuffer();
    
    // Extract text from the PDF buffer
    const pdfData = await pdfParse(Buffer.from(arrayBuffer));
    const resumeText = pdfData.text;

    // 4. Initialize Gemini
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    
    // 5. Prompt and Call Model
    const prompt = `
Extract the following from this resume as strict JSON, no markdown fences, no commentary:
{
  "skills": ["string", ...],
  "projects": [{ "title": "string", "description": "string" }],
  "certifications": [{ "title": "string", "issuer": "string" }]
}
Only include items explicitly present in the resume. Do not invent or infer anything not stated.
    `;

    let response;
    let retries = 3;
    let delay = 2000; // 2 seconds

    while (retries > 0) {
      try {
        response = await ai.models.generateContent({
          model: 'gemini-3.6-flash',
          contents: [
            resumeText,
            prompt
          ],
          config: {
            responseMimeType: 'application/json',
          }
        });
        break; // Success! Exit the retry loop.
      } catch (err) {
        const errorString = (err.message || '').toUpperCase();
        if (err.status === 503 || errorString.includes('503') || errorString.includes('UNAVAILABLE') || errorString.includes('HIGH DEMAND')) {
          retries--;
          if (retries === 0) throw err;
          console.log(`High Demand hit. Retrying in ${delay/1000}s...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          delay *= 2; // Exponential backoff
        } else {
          throw err; // Throw non-retriable errors immediately
        }
      }
    }

    const text = response.text;
    
    // Parse to ensure it's valid JSON
    const parsedData = JSON.parse(text);
    
    // 6. Return Data
    return res.status(200).json(parsedData);
  } catch (error) {
    console.error('Parsing Error:', error);
    return res.status(500).json({ error: `Failed to parse resume automatically: ${error.message}` });
  }
}
