// src/services/vocabService.js
import { callGemini, safeJson } from './aiService';

/**
 * Suggest definitions, pronunciation, part of speech and examples for a list of words using Gemini
 * @param {string[]} words 
 */
export const suggestDefinitions = async (words) => {
  if (!words || words.length === 0) return [];
  
  const system = `You are a professional English teacher for Vietnamese students. 
Return valid JSON representing an array of word definitions.`;

  const user = `For the following English words, provide their Vietnamese definition, IPA pronunciation, Part of Speech (noun, verb, adj, etc.), and an example sentence with its translation.

Words: ${words.join(', ')}

Required JSON structure:
[
  {
    "word": "...",
    "definition": "...",
    "type": "noun/verb/adj/...",
    "ipa": "...",
    "example": "...",
    "exampleVi": "..."
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
