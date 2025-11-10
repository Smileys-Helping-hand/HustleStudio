import { callOpenAI } from './openaiClient.js';

export const generateWeeklySummary = async (data) => {
  const payload = Array.isArray(data) || typeof data === 'object' ? JSON.stringify(data) : String(data ?? '');
  const prompt = `Summarise this week's business performance in under 250 words. Include sales highlights, growth areas, credit usage, and one actionable insight. Data: ${payload}`;
  return callOpenAI(prompt, 'gpt-4o-mini', {
    temperature: 0.25,
    systemPrompt:
      'You are Hustle Studio\'s StrategyGPT. Provide confident, data-aware insights for leadership with one clear recommendation.',
  });
};
