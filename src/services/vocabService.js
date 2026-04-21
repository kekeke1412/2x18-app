// src/services/vocabService.js
import { callAI, safeJson } from './aiService';

/**
 * Suggest definitions, pronunciation, part of speech and examples for a list of words
 * @param {string[]} words 
 */
export const suggestDefinitions = async (words, source = '') => {
  if (!words || words.length === 0) return [];

  const system = `You are a professional IELTS instructor and an expert in Technical English.
Your task is to provide comprehensive vocabulary data. 
Return ONLY valid JSON representing an array of objects.`;

  const exampleGuidance = source
    ? `STRICTLY use or adapt authentic example sentences from the book/source: "${source}". The sentences should feel like they were written by the author of "${source}".`
    : `Topic: Electronics, Semiconductors, IC Design, or Physics. Level: IELTS Band 6.0 style (Academic but clear).`;

  const user = `For the following words: ${words.join(', ')}
Provide: IPA, Type, Concise Vietnamese Definition, and Example Sentence.

STRICT REQUIREMENTS:
1. Examples: ${exampleGuidance}
2. Example Length: Under 15 words.
3. Word Types: Accurate (n, v, adj, adv, phr v, idiom, collocation).

Required JSON structure:
[
  {
    "word": "...",
    "definition": "Nghĩa tiếng Việt súc tích",
    "type": "...",
    "ipa": "phiên âm chuẩn",
    "example": "Sentence reflecting ${source || 'Academic context'}",
    "exampleVi": "Dịch nghĩa ví dụ"
  }
]`;

  try {
    const text = await callAI(system, user, { temperature: 1.3, responseMimeType: 'application/json' });
    const result = safeJson(text, []);
    return Array.isArray(result) ? result : [];
  } catch (error) {
    console.error('[VocabAI] Error suggesting definitions:', error);
    return [];
  }
};
