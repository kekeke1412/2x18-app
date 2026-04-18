// src/services/vocabService.js
import { callGemini, safeJson } from './aiService';

/**
 * Suggest definitions, pronunciation and examples for a list of words using Gemini
 * @param {string[]} words 
 */
export const suggestDefinitions = async (words) => {
  if (!words || words.length === 0) return [];
  
  const system = `You are a professional English teacher for Vietnamese students. 
Return ONLY a JSON array. No markdown, no code fences.`;

  const user = `For the following list of words, provide:
1. Definition in Vietnamese (clear and concise)
2. Pronunciation (IPA)
3. An example sentence in English
4. Vietnamese translation of that example sentence.

Words: ${words.join(', ')}

Return JSON:
[
  {
    "word": "word",
    "definition": "nghĩa tiếng Việt",
    "ipa": "/pronunciation/",
    "example": "example sentence",
    "exampleVi": "nghĩa của ví dụ"
  }
]`;

  try {
    const text = await callGemini(system, user, { temperature: 0.3 });
    return safeJson(text, words.map(w => ({ word: w, definition: '', ipa: '', example: '', exampleVi: '' })));
  } catch (error) {
    console.error('[VocabAI] Error suggesting definitions:', error);
    return words.map(w => ({ word: w, definition: '', ipa: '', example: '', exampleVi: '' }));
  }
};
