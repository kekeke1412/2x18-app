// src/services/vocabService.js
import { callGemini, safeJson } from './aiService';

/**
 * Suggest definitions, pronunciation, part of speech and examples for a list of words using Gemini
 * @param {string[]} words 
 */
export const suggestDefinitions = async (words) => {
  if (!words || words.length === 0) return [];
  
  const system = `You are a professional IELTS instructor and an expert in Technical English (Electronics & Semiconductors). 
Return valid JSON representing an array of high-quality word definitions.`;

  const user = `For the following English words, provide professional definitions and academic examples.
  
STRICT REQUIREMENTS:
1. Topic Preference: Use examples related to Electronics, Semiconductors, IC Design, or Physics research.
2. Word Types: Accurate IELTS classification (n, v, adj, adv, phr v, idiom, collocation).
3. Example: Must be high-level academic English (IELTS Band 7.0+ style).

Words: ${words.join(', ')}

Required JSON structure:
[
  {
    "word": "...",
    "definition": "Nghĩa tiếng Việt súc tích",
    "type": "n/v/adj/adv/phr v/idiom/collocation",
    "ipa": "phiên âm chuẩn",
    "example": "Academic sentence related to Electronics/Semiconductors",
    "exampleVi": "Dịch nghĩa ví dụ sang tiếng Việt"
  }
]`;

  try {
    const text = await callGemini(system, user, { temperature: 0.1, responseMimeType: 'application/json' });
    const result = safeJson(text, []);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('[VocabAI] Error suggesting definitions:', error);
    return [];
  }
};
