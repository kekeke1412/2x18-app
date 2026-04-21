// src/services/vocabService.js
import { callAI, safeJson } from './aiService';

/**
 * Suggest definitions, pronunciation, part of speech and examples for a list of words
 * @param {string[]} words 
 * @param {object} currentUser - Thông tin user để lấy API Key cá nhân
 */
export const suggestDefinitions = async (words, currentUser) => {
  if (!words || words.length === 0) return [];

  const system = `You are a professional IELTS instructor and an expert in Technical English (Electronics & Semiconductors). 
Return valid JSON representing an array of high-quality word definitions.`;

  const user = `For the following English words, provide professional definitions and academic examples.
  
STRICT REQUIREMENTS:
1. Level: IELTS Band 6.0 style (Academic but clear).
2. Topic: Electronics, Semiconductors, IC Design, or Physics.
3. Example Length: VERY SHORT (Strictly under 12 words) to fit mobile screens.
4. Word Types: Accurate classification (n, v, adj, adv, phr v, idiom, collocation).

Words: ${words.join(', ')}

Required JSON structure:
[
  {
    "word": "...",
    "definition": "Nghĩa tiếng Việt súc tích",
    "type": "...",
    "ipa": "phiên âm chuẩn",
    "example": "Short academic sentence (<12 words)",
    "exampleVi": "Dịch nghĩa ví dụ"
  }
]`;

  try {
    const text = await callAI(system, user, { currentUser, temperature: 0.1, responseMimeType: 'application/json' });
    const result = safeJson(text, []);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('[VocabAI] Error suggesting definitions:', error);
    return [];
  }
};
