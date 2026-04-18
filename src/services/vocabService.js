// src/services/vocabService.js
import { model } from './aiService';

/**
 * Suggest definitions, pronunciation and examples for a list of words using Gemini
 * @param {string[]} words 
 */
export const suggestDefinitions = async (words) => {
  if (!words || words.length === 0) return [];
  
  const prompt = `
    You are a professional English teacher. 
    For the following list of words, provide:
    1. Definition in Vietnamese (clear and concise)
    2. Pronunciation (IPA)
    3. An example sentence in English
    4. Vietnamese translation of that example sentence.

    Words: ${words.join(', ')}

    Return ONLY a JSON array of objects with this structure:
    [
      {
        "word": "word",
        "definition": "nghĩa tiếng Việt",
        "ipa": "/pronunciation/",
        "example": "example sentence",
        "exampleVi": "nghĩa của ví dụ"
      }
    ]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON if needed (sometimes Gemini wraps it in ```json)
    const jsonStr = text.replace(/```json|```/g, '').trim();
    return JSON.parse(jsonStr);
  } catch (error) {
    console.error('[VocabAI] Error suggesting definitions:', error);
    return words.map(w => ({ word: w, definition: '', ipa: '', example: '', exampleVi: '' }));
  }
};
