import { callOpenAI } from './openaiClient.js';

const growthModel = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_MARKETING_AI_MODEL) {
    return import.meta.env.VITE_MARKETING_AI_MODEL;
  }
  const nodeEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object'
      ? globalThis.process.env
      : undefined;
  if (nodeEnv?.VITE_MARKETING_AI_MODEL) {
    return nodeEnv.VITE_MARKETING_AI_MODEL;
  }
  return 'gpt-4o-mini';
};

export async function adviseGrowth(metrics) {
  const prompt = `You are the Hustle Studio Growth Coach. Analyse the workspace metrics below and provide:\n- 3 bullet marketing insights\n- 1 risk to watch\n- 1 high-impact action for next week.\nData: ${JSON.stringify(
    metrics
  )}`;
  const response = await callOpenAI(prompt, growthModel());
  if (typeof response === 'string') return response.trim();
  return response?.choices?.[0]?.message?.content?.trim() ?? 'No insights generated.';
}
