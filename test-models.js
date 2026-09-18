import { readFileSync } from 'fs';
import { GoogleGenAI } from '@google/genai';

const envFile = readFileSync('.env', 'utf-8');
const key = envFile.split('\n').find(l => l.startsWith('GEMINI_API_KEY=')).split('=')[1].trim();

const ai = new GoogleGenAI({ apiKey: key });

async function run() {
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: "Hello"
    });
    console.log(response.text);
  } catch (e) {
    console.error("1.5-flash failed:", e.message);
    try {
      const response2 = await ai.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: "Hello"
      });
      console.log("2.0-flash success:", response2.text);
    } catch (e2) {
      console.error("2.0-flash failed:", e2.message);
    }
  }
}
run();
