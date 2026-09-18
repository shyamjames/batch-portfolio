import admin from 'firebase-admin';
import { GoogleGenAI } from '@google/genai';

// Initialize Firebase Admin (only once)
if (!admin.apps.length) {
  try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      console.warn('FIREBASE_SERVICE_ACCOUNT environment variable is not set. Auth verification will fail.');
    }
  } catch (error) {
    console.error('Firebase Admin initialization error', error);
  }
}

export default async function handler(req, res) {
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
    const decodedToken = await admin.auth().verifyIdToken(token);
    if (!decodedToken.uid) {
      return res.status(401).json({ error: 'Unauthorized: Invalid token' });
    }
  } catch (error) {
    console.error('Token verification failed:', error);
    return res.status(401).json({ error: 'Unauthorized: Token verification failed' });
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
    const pdfBase64 = Buffer.from(arrayBuffer).toString('base64');

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

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          inlineData: {
            data: pdfBase64,
            mimeType: 'application/pdf'
          }
        },
        prompt
      ],
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = response.text;
    
    // Parse to ensure it's valid JSON
    const parsedData = JSON.parse(text);
    
    // 6. Return Data
    return res.status(200).json(parsedData);
  } catch (error) {
    console.error('Parsing Error:', error);
    return res.status(500).json({ error: 'Failed to parse resume automatically' });
  }
}
